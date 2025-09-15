/**
 * Accessibility utilities and audit helpers
 * WCAG 2.1 AA compliance tools
 */

import { Logger } from './logger';

interface AccessibilityIssue {
  element: HTMLElement;
  type: 'missing-alt' | 'missing-label' | 'low-contrast' | 'focus-trap' | 'aria-missing';
  severity: 'error' | 'warning';
  message: string;
}

export class AccessibilityAudit {
  private issues: AccessibilityIssue[] = [];

  /**
   * Run comprehensive accessibility audit
   */
  static runAudit(): AccessibilityIssue[] {
    const audit = new AccessibilityAudit();
    
    audit.checkImages();
    audit.checkLabels();
    audit.checkHeadingStructure();
    audit.checkFocusManagement();
    audit.checkAriaAttributes();

    Logger.info('Accessibility audit completed', { 
      issues: audit.issues.length,
      errors: audit.issues.filter(i => i.severity === 'error').length
    });

    return audit.issues;
  }

  /**
   * Check all images have alt text
   */
  private checkImages(): void {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
      if (!img.alt || img.alt.trim() === '') {
        this.addIssue(img, 'missing-alt', 'error', 'Image missing alternative text');
      }
    });
  }

  /**
   * Check form inputs have proper labels
   */
  private checkLabels(): void {
    const inputs = document.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      const id = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = document.querySelector(`label[for="${id}"]`);
        if (!label && !ariaLabel && !ariaLabelledBy) {
          this.addIssue(input as HTMLElement, 'missing-label', 'error', 'Form control missing accessible label');
        }
      } else if (!ariaLabel && !ariaLabelledBy) {
        this.addIssue(input as HTMLElement, 'missing-label', 'error', 'Form control missing accessible label');
      }
    });
  }

  /**
   * Check heading structure is logical
   */
  private checkHeadingStructure(): void {
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach(heading => {
      const level = parseInt(heading.tagName.charAt(1));
      
      if (level > previousLevel + 1) {
        this.addIssue(heading as HTMLElement, 'aria-missing', 'warning', 
          `Heading level ${level} follows h${previousLevel} - skips levels`);
      }
      
      previousLevel = level;
    });
  }

  /**
   * Check focus management
   */
  private checkFocusManagement(): void {
    const focusableElements = document.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    focusableElements.forEach(element => {
      const tabIndex = element.getAttribute('tabindex');
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addIssue(element as HTMLElement, 'focus-trap', 'warning', 
          'Avoid positive tabindex values - use 0 or -1');
      }
    });
  }

  /**
   * Check ARIA attributes
   */
  private checkAriaAttributes(): void {
    const elementsWithRole = document.querySelectorAll('[role]');
    
    elementsWithRole.forEach(element => {
      const role = element.getAttribute('role');
      
      // Check if interactive elements have accessible names
      if (['button', 'link', 'menuitem'].includes(role!)) {
        const hasName = element.getAttribute('aria-label') ||
                       element.getAttribute('aria-labelledby') ||
                       element.textContent?.trim();
        
        if (!hasName) {
          this.addIssue(element as HTMLElement, 'aria-missing', 'error',
            `Interactive element with role="${role}" missing accessible name`);
        }
      }
    });
  }

  private addIssue(element: HTMLElement, type: AccessibilityIssue['type'], 
                   severity: AccessibilityIssue['severity'], message: string): void {
    this.issues.push({ element, type, severity, message });
  }
}

/**
 * Accessibility utilities for components
 */
export class AccessibilityUtils {
  /**
   * Generate unique ID for form controls
   */
  static generateId(prefix = 'field'): string {
    return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Check color contrast ratio
   */
  static checkContrast(foreground: string, background: string): number {
    const rgb1 = this.hexToRgb(foreground);
    const rgb2 = this.hexToRgb(background);
    
    if (!rgb1 || !rgb2) return 0;
    
    const l1 = this.getLuminance(rgb1);
    const l2 = this.getLuminance(rgb2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Announce changes to screen readers
   */
  static announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }

  /**
   * Focus management for modals/drawers
   */
  static trapFocus(container: HTMLElement): () => void {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    // Focus first element
    firstElement?.focus();

    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }

  private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }

  private static getLuminance(rgb: { r: number; g: number; b: number }): number {
    const { r, g, b } = rgb;
    
    const rsRGB = r / 255;
    const gsRGB = g / 255;
    const bsRGB = b / 255;

    const rLin = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const gLin = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const bLin = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

    return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
  }
}