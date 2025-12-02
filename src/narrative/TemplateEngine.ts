/**
 * TemplateEngine - Simple template system for generating narrative prose
 *
 * Supports:
 * - Variable interpolation: {{variable}} or {{object.property}}
 * - Conditionals: {{#if condition}}...{{/if}} and {{#unless condition}}...{{/unless}}
 * - Iteration: {{#each list}}...{{/each}} with {{this}} and {{@index}}
 * - Filters: {{variable | filter}} e.g., {{name | uppercase}}
 * - Comments: {{! This is a comment }}
 */

import {
  TemplateDefinition,
  TemplateContext,
  StyleConfig,
  DEFAULT_STYLE,
} from './types';

export interface RenderResult {
  success: boolean;
  output: string;
  errors: string[];
  warnings: string[];
}

type FilterFn = (value: unknown, ...args: string[]) => string;

export class TemplateEngine {
  private templates: Map<string, TemplateDefinition> = new Map();
  private filters: Map<string, FilterFn> = new Map();
  private partials: Map<string, string> = new Map();

  constructor() {
    this.registerBuiltInFilters();
  }

  /**
   * Register a template
   */
  registerTemplate(template: TemplateDefinition): void {
    this.templates.set(template.id, template);
  }

  /**
   * Register a custom filter
   */
  registerFilter(name: string, fn: FilterFn): void {
    this.filters.set(name, fn);
  }

  /**
   * Register a partial (reusable template fragment)
   */
  registerPartial(name: string, template: string): void {
    this.partials.set(name, template);
  }

  /**
   * Get a registered template
   */
  getTemplate(id: string): TemplateDefinition | undefined {
    return this.templates.get(id);
  }

  /**
   * Render a template by ID
   */
  render(templateId: string, context: Partial<TemplateContext>): RenderResult {
    const template = this.templates.get(templateId);
    if (!template) {
      return {
        success: false,
        output: '',
        errors: [`Template not found: ${templateId}`],
        warnings: [],
      };
    }

    return this.renderString(template.template, {
      ...context,
      style: context.style ?? DEFAULT_STYLE,
    } as TemplateContext);
  }

  /**
   * Render a raw template string
   */
  renderString(template: string, context: TemplateContext): RenderResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Remove comments
      let output = template.replace(/\{\{![\s\S]*?\}\}/g, '');

      // Process partials first
      output = this.processPartials(output, context, errors);

      // Process each/loops
      output = this.processEach(output, context, errors);

      // Process conditionals
      output = this.processConditionals(output, context, errors);

      // Process variables
      output = this.processVariables(output, context, warnings);

      // Clean up extra whitespace
      output = this.cleanWhitespace(output);

      return {
        success: errors.length === 0,
        output,
        errors,
        warnings,
      };
    } catch (err) {
      return {
        success: false,
        output: '',
        errors: [`Template rendering failed: ${err}`],
        warnings,
      };
    }
  }

  /**
   * Validate a template string
   */
  validate(template: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for unclosed tags
    const openIfs = (template.match(/\{\{#if\s+[^}]+\}\}/g) || []).length;
    const closeIfs = (template.match(/\{\{\/if\}\}/g) || []).length;
    if (openIfs !== closeIfs) {
      errors.push(`Mismatched if/endif: ${openIfs} opens, ${closeIfs} closes`);
    }

    const openUnless = (template.match(/\{\{#unless\s+[^}]+\}\}/g) || []).length;
    const closeUnless = (template.match(/\{\{\/unless\}\}/g) || []).length;
    if (openUnless !== closeUnless) {
      errors.push(`Mismatched unless/endunless: ${openUnless} opens, ${closeUnless} closes`);
    }

    const openEach = (template.match(/\{\{#each\s+[^}]+\}\}/g) || []).length;
    const closeEach = (template.match(/\{\{\/each\}\}/g) || []).length;
    if (openEach !== closeEach) {
      errors.push(`Mismatched each/endeach: ${openEach} opens, ${closeEach} closes`);
    }

    // Check for malformed variables
    const malformed = template.match(/\{\{[^}]*$/gm);
    if (malformed) {
      errors.push(`Unclosed template tag: ${malformed[0]}`);
    }

    return { valid: errors.length === 0, errors };
  }

  // ============================================
  // Private Processing Methods
  // ============================================

  private processPartials(
    template: string,
    context: TemplateContext,
    errors: string[]
  ): string {
    // {{> partialName}}
    return template.replace(/\{\{>\s*(\w+)\s*\}\}/g, (match, name) => {
      const partial = this.partials.get(name);
      if (!partial) {
        errors.push(`Partial not found: ${name}`);
        return '';
      }
      // Recursively render the partial
      const result = this.renderString(partial, context);
      if (!result.success) {
        errors.push(...result.errors);
      }
      return result.output;
    });
  }

  private processEach(
    template: string,
    context: TemplateContext,
    errors: string[]
  ): string {
    // {{#each list}}...{{/each}}
    const eachRegex = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

    return template.replace(eachRegex, (match, listPath, body) => {
      const list = this.resolvePath(listPath.trim(), context);

      if (!Array.isArray(list)) {
        if (list === undefined || list === null) {
          return ''; // Empty for missing arrays
        }
        errors.push(`Expected array for each: ${listPath}`);
        return '';
      }

      return list
        .map((item, index) => {
          // Create a new context with 'this' and '@index'
          const itemContext = {
            ...context,
            this: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === list.length - 1,
          };
          return this.processVariables(
            this.processConditionals(body, itemContext as TemplateContext, errors),
            itemContext as TemplateContext,
            []
          );
        })
        .join('');
    });
  }

  private processConditionals(
    template: string,
    context: TemplateContext,
    errors: string[]
  ): string {
    // Process {{#if}}...{{else}}...{{/if}}
    const ifElseRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{else\}\}([\s\S]*?)\{\{\/if\}\}/g;
    template = template.replace(ifElseRegex, (match, condition, ifBody, elseBody) => {
      const value = this.evaluateCondition(condition.trim(), context);
      return value ? ifBody : elseBody;
    });

    // Process {{#if}}...{{/if}} (no else)
    const ifRegex = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
    template = template.replace(ifRegex, (match, condition, body) => {
      const value = this.evaluateCondition(condition.trim(), context);
      return value ? body : '';
    });

    // Process {{#unless}}...{{/unless}}
    const unlessRegex = /\{\{#unless\s+([^}]+)\}\}([\s\S]*?)\{\{\/unless\}\}/g;
    template = template.replace(unlessRegex, (match, condition, body) => {
      const value = this.evaluateCondition(condition.trim(), context);
      return value ? '' : body;
    });

    return template;
  }

  private processVariables(
    template: string,
    context: TemplateContext,
    warnings: string[]
  ): string {
    // {{variable}} or {{variable | filter}}
    const varRegex = /\{\{([^#/>!][^}]*)\}\}/g;

    return template.replace(varRegex, (match, content) => {
      const parts = content.split('|').map((p: string) => p.trim());
      const path = parts[0];
      const filters = parts.slice(1);

      let value = this.resolvePath(path, context);

      if (value === undefined) {
        warnings.push(`Variable not found: ${path}`);
        return '';
      }

      // Apply filters
      for (const filterExpr of filters) {
        const [filterName, ...args] = filterExpr.split(':').map((s: string) => s.trim());
        const filter = this.filters.get(filterName);
        if (filter) {
          value = filter(value, ...args);
        } else {
          warnings.push(`Filter not found: ${filterName}`);
        }
      }

      return String(value ?? '');
    });
  }

  private resolvePath(path: string, context: unknown): unknown {
    if (path === 'this') {
      return (context as Record<string, unknown>)['this'];
    }

    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    // If not found directly, try looking in `custom` property
    if (current === undefined && typeof context === 'object' && context !== null) {
      const ctx = context as Record<string, unknown>;
      if (ctx.custom && typeof ctx.custom === 'object') {
        current = ctx.custom;
        for (const part of parts) {
          if (current === null || current === undefined) {
            return undefined;
          }
          if (typeof current === 'object') {
            current = (current as Record<string, unknown>)[part];
          } else {
            return undefined;
          }
        }
      }
    }

    return current;
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    // Handle comparison operators
    const comparisonMatch = condition.match(/^(.+?)\s*(===?|!==?|>=?|<=?)\s*(.+)$/);
    if (comparisonMatch) {
      const left = this.resolveValue(comparisonMatch[1].trim(), context);
      const operator = comparisonMatch[2];
      const right = this.resolveValue(comparisonMatch[3].trim(), context);

      switch (operator) {
        case '==':
        case '===':
          return left === right;
        case '!=':
        case '!==':
          return left !== right;
        case '>':
          return Number(left) > Number(right);
        case '>=':
          return Number(left) >= Number(right);
        case '<':
          return Number(left) < Number(right);
        case '<=':
          return Number(left) <= Number(right);
      }
    }

    // Simple truthy check
    const value = this.resolvePath(condition, context);
    return this.isTruthy(value);
  }

  private resolveValue(expr: string, context: TemplateContext): unknown {
    // String literal
    if ((expr.startsWith('"') && expr.endsWith('"')) ||
        (expr.startsWith("'") && expr.endsWith("'"))) {
      return expr.slice(1, -1);
    }

    // Number literal
    if (/^-?\d+(\.\d+)?$/.test(expr)) {
      return parseFloat(expr);
    }

    // Boolean literal
    if (expr === 'true') return true;
    if (expr === 'false') return false;
    if (expr === 'null') return null;

    // Path lookup
    return this.resolvePath(expr, context);
  }

  private isTruthy(value: unknown): boolean {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  }

  private cleanWhitespace(text: string): string {
    // Remove empty lines but preserve paragraph breaks
    return text
      .replace(/\n{3,}/g, '\n\n')
      .replace(/^\s+$/gm, '')
      .trim();
  }

  private registerBuiltInFilters(): void {
    // String filters
    this.registerFilter('uppercase', (v) => String(v).toUpperCase());
    this.registerFilter('lowercase', (v) => String(v).toLowerCase());
    this.registerFilter('capitalize', (v) => {
      const s = String(v);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });
    this.registerFilter('titlecase', (v) => {
      return String(v)
        .split(' ')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');
    });
    this.registerFilter('trim', (v) => String(v).trim());

    // Number filters
    this.registerFilter('round', (v) => String(Math.round(Number(v))));
    this.registerFilter('floor', (v) => String(Math.floor(Number(v))));
    this.registerFilter('ceil', (v) => String(Math.ceil(Number(v))));
    this.registerFilter('abs', (v) => String(Math.abs(Number(v))));

    // List filters
    this.registerFilter('length', (v) => {
      if (Array.isArray(v)) return String(v.length);
      if (typeof v === 'string') return String(v.length);
      return '0';
    });
    this.registerFilter('first', (v) => {
      if (Array.isArray(v) && v.length > 0) return String(v[0]);
      return '';
    });
    this.registerFilter('last', (v) => {
      if (Array.isArray(v) && v.length > 0) return String(v[v.length - 1]);
      return '';
    });
    this.registerFilter('join', (v, separator = ', ') => {
      if (Array.isArray(v)) return v.join(separator);
      return String(v);
    });

    // Boolean filters
    this.registerFilter('not', (v) => String(!v));
    this.registerFilter('yesno', (v, yes = 'yes', no = 'no') => v ? yes : no);

    // Formatting filters
    this.registerFilter('pluralize', (v, singular = '', plural = 's') => {
      const n = Number(v);
      return n === 1 ? singular : plural;
    });
    this.registerFilter('ordinal', (v) => {
      const n = Number(v);
      const s = ['th', 'st', 'nd', 'rd'];
      const mod = n % 100;
      return String(n) + (s[(mod - 20) % 10] || s[mod] || s[0]);
    });

    // Time/date filters
    this.registerFilter('time', (v) => {
      // Extract HH:MM from ISO timestamp or time slot
      const s = String(v);
      const match = s.match(/(\d{2}):(\d{2})/);
      return match ? `${match[1]}:${match[2]}` : s;
    });
    this.registerFilter('date', (v) => {
      try {
        return new Date(String(v)).toLocaleDateString();
      } catch {
        return String(v);
      }
    });

    // Truncation
    this.registerFilter('truncate', (v, length = '50') => {
      const s = String(v);
      const len = parseInt(length, 10);
      return s.length > len ? s.slice(0, len) + '...' : s;
    });

    // Default value
    this.registerFilter('default', (v, defaultValue = '') => {
      return v === undefined || v === null || v === '' ? defaultValue : String(v);
    });
  }
}

// ============================================
// Built-in Templates
// ============================================

export const BUILT_IN_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'loop-summary-brief',
    name: 'Brief Loop Summary',
    description: 'One-line summary of a loop',
    template: `Loop #{{loop.sequence_number}}: {{loop.emotional_state_start | capitalize}} to {{loop.emotional_state_end | capitalize}} - {{loop.outcome.type}}{{#if loop.outcome.cause}} ({{loop.outcome.cause}}){{/if}}`,
    variables: [
      { name: 'loop', type: 'object', required: true },
    ],
  },
  {
    id: 'loop-summary-standard',
    name: 'Standard Loop Summary',
    description: 'Multi-sentence loop summary',
    template: `Loop #{{loop.sequence_number}} began with the subject feeling {{loop.emotional_state_start}}.
{{#if loop.decisions.length}}They made {{loop.decisions | length}} decision{{loop.decisions | length | pluralize}}. {{/if}}
The loop ended in {{loop.outcome.type}}{{#if loop.outcome.cause}} due to {{loop.outcome.cause}}{{/if}}.
{{#if loop.emotional_state_end}}Final emotional state: {{loop.emotional_state_end}}.{{/if}}`,
    variables: [
      { name: 'loop', type: 'object', required: true },
    ],
  },
  {
    id: 'decision-brief',
    name: 'Brief Decision',
    description: 'Single decision description',
    template: `At {{decision.timestamp | time}}, chose option {{decision.choice_index}}{{#if decision.choice_label}}: {{decision.choice_label}}{{/if}}.`,
    variables: [
      { name: 'decision', type: 'object', required: true },
    ],
  },
  {
    id: 'equivalence-class-summary',
    name: 'Equivalence Class Summary',
    description: 'Summary of a loop equivalence class',
    template: `{{equivalenceClass.member_count}} loop{{equivalenceClass.member_count | pluralize}} ended in {{equivalenceClass.outcome_summary}}.
{{#if equivalenceClass.common_tags.length}}Common themes: {{equivalenceClass.common_tags | join}}.{{/if}}`,
    variables: [
      { name: 'equivalenceClass', type: 'object', required: true },
    ],
  },
];

/**
 * Create a pre-configured template engine with built-in templates
 */
export function createTemplateEngine(): TemplateEngine {
  const engine = new TemplateEngine();

  for (const template of BUILT_IN_TEMPLATES) {
    engine.registerTemplate(template);
  }

  return engine;
}
