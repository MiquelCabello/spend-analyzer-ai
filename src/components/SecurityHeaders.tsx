/**
 * Security Headers Component
 * Adds security headers via meta tags for CSP and other security policies
 */

import { useEffect } from 'react';
import { SecurityUtils } from '@/lib/security';

export function SecurityHeaders() {
  useEffect(() => {
    // Add security headers via meta tags
    const addMetaTag = (name: string, content: string) => {
      // Remove existing meta tag if it exists
      const existing = document.querySelector(`meta[name="${name}"], meta[http-equiv="${name}"]`);
      if (existing) {
        existing.remove();
      }

      // Add new meta tag
      const meta = document.createElement('meta');
      if (name === 'Content-Security-Policy') {
        meta.setAttribute('http-equiv', name);
      } else {
        meta.setAttribute('name', name);
      }
      meta.setAttribute('content', content);
      document.head.appendChild(meta);
    };

    // Apply security headers
    const headers = SecurityUtils.getSecurityHeaders();
    Object.entries(headers).forEach(([name, content]) => {
      addMetaTag(name, content);
    });

    // Add viewport meta tag for responsive design
    const viewportMeta = document.querySelector('meta[name="viewport"]');
    if (!viewportMeta) {
      addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=5.0');
    }

    // Add charset meta tag
    const charsetMeta = document.querySelector('meta[charset]');
    if (!charsetMeta) {
      const meta = document.createElement('meta');
      meta.setAttribute('charset', 'UTF-8');
      document.head.insertBefore(meta, document.head.firstChild);
    }

    return () => {
      // Cleanup function (optional)
      // Could remove meta tags if component unmounts
    };
  }, []);

  return null; // This component doesn't render anything visible
}

// Hook for managing security in specific components
export function useSecurityHeaders(additionalCSP?: string) {
  useEffect(() => {
    if (additionalCSP) {
      const currentCSP = SecurityUtils.getCSPDirectives();
      const newCSP = `${currentCSP}; ${additionalCSP}`;
      
      const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      if (meta) {
        meta.setAttribute('content', newCSP);
      }
    }
  }, [additionalCSP]);
}