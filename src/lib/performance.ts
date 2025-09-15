/**
 * Performance monitoring and optimization utilities
 */

import React from 'react';
import { Logger } from './logger';

interface PerformanceMetrics {
  navigationStart: number;
  loadComplete: number;
  domContentLoaded: number;
  firstContentfulPaint?: number;
  largestContentfulPaint?: number;
  firstInputDelay?: number;
  cumulativeLayoutShift?: number;
}

interface BundleAnalysis {
  totalSize: number;
  chunks: Array<{
    name: string;
    size: number;
    compressed?: number;
  }>;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private observer?: PerformanceObserver;

  constructor() {
    this.metrics = {
      navigationStart: performance.timeOrigin,
      loadComplete: 0,
      domContentLoaded: 0,
    };
    
    this.initializeMetrics();
    this.observeWebVitals();
  }

  /**
   * Initialize performance monitoring
   */
  static initialize(): PerformanceMonitor {
    return new PerformanceMonitor();
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Log performance summary
   */
  logSummary(): void {
    const loadTime = this.metrics.loadComplete - this.metrics.navigationStart;
    const domTime = this.metrics.domContentLoaded - this.metrics.navigationStart;

    Logger.info('Performance Summary', {
      loadTime: `${loadTime.toFixed(2)}ms`,
      domTime: `${domTime.toFixed(2)}ms`,
      fcp: this.metrics.firstContentfulPaint ? `${this.metrics.firstContentfulPaint.toFixed(2)}ms` : 'N/A',
      lcp: this.metrics.largestContentfulPaint ? `${this.metrics.largestContentfulPaint.toFixed(2)}ms` : 'N/A',
      fid: this.metrics.firstInputDelay ? `${this.metrics.firstInputDelay.toFixed(2)}ms` : 'N/A',
      cls: this.metrics.cumulativeLayoutShift ? this.metrics.cumulativeLayoutShift.toFixed(4) : 'N/A',
    });
  }

  /**
   * Measure component render time
   */
  measureComponent(name: string, fn: () => void): number {
    const start = performance.now();
    fn();
    const end = performance.now();
    const duration = end - start;

    Logger.debug('Component Render Time', {
      component: name,
      duration: `${duration.toFixed(2)}ms`,
    });

    return duration;
  }

  /**
   * Monitor resource loading
   */
  analyzeResources(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const analysis = {
      scripts: resources.filter(r => r.initiatorType === 'script'),
      stylesheets: resources.filter(r => r.initiatorType === 'css'),
      images: resources.filter(r => r.initiatorType === 'img'),
      fonts: resources.filter(r => r.name.includes('font')),
    };

    const summary = {
      totalRequests: resources.length,
      totalTransferSize: resources.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      slowestResource: resources.reduce((slowest, current) => 
        (current.duration > slowest.duration) ? current : slowest
      ),
      scriptsSize: analysis.scripts.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      stylesheetsSize: analysis.stylesheets.reduce((sum, r) => sum + (r.transferSize || 0), 0),
      imagesSize: analysis.images.reduce((sum, r) => sum + (r.transferSize || 0), 0),
    };

    Logger.info('Resource Analysis', summary);
  }

  /**
   * Check for memory leaks
   */
  checkMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      const memoryInfo = {
        used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
        limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`,
        usage: `${((memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100).toFixed(1)}%`,
      };

      Logger.info('Memory Usage', memoryInfo);

      // Warning if memory usage is high
      if (memory.usedJSHeapSize / memory.jsHeapSizeLimit > 0.8) {
        Logger.warn('High memory usage detected', memoryInfo);
      }
    }
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  private initializeMetrics(): void {
    // DOM Content Loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        this.metrics.domContentLoaded = performance.now();
      });
    } else {
      this.metrics.domContentLoaded = performance.now();
    }

    // Load Complete
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => {
        this.metrics.loadComplete = performance.now();
        this.logSummary();
        this.analyzeResources();
      });
    } else {
      this.metrics.loadComplete = performance.now();
    }
  }

  private observeWebVitals(): void {
    // Observe paint metrics
    if ('PerformanceObserver' in window) {
      try {
        this.observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            switch (entry.name) {
              case 'first-contentful-paint':
                this.metrics.firstContentfulPaint = entry.startTime;
                break;
              case 'largest-contentful-paint':
                this.metrics.largestContentfulPaint = entry.startTime;
                break;
              default:
                if (entry.entryType === 'first-input') {
                  this.metrics.firstInputDelay = (entry as any).processingStart - entry.startTime;
                }
                if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
                  this.metrics.cumulativeLayoutShift = 
                    (this.metrics.cumulativeLayoutShift || 0) + (entry as any).value;
                }
            }
          }
        });

        this.observer.observe({ entryTypes: ['paint', 'largest-contentful-paint', 'first-input', 'layout-shift'] });
      } catch (error) {
        Logger.warn('Performance Observer not fully supported', { error: error instanceof Error ? error.message : 'Unknown' });
      }
    }
  }
}

/**
 * Bundle analysis utilities
 */
export class BundleAnalyzer {
  /**
   * Analyze current bundle size (development helper)
   */
  static analyzeBundleSize(): BundleAnalysis {
    // In a real implementation, this would integrate with webpack-bundle-analyzer
    // For now, we'll provide basic resource analysis
    
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const jsResources = resources.filter(r => 
      r.name.includes('.js') || r.initiatorType === 'script'
    );

    const chunks = jsResources.map(resource => ({
      name: resource.name.split('/').pop() || 'unknown',
      size: resource.transferSize || 0,
      compressed: resource.encodedBodySize || 0,
    }));

    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

    Logger.info('Bundle Analysis', {
      totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
      chunks: chunks.length,
      largestChunk: chunks.reduce((largest, current) => 
        current.size > largest.size ? current : largest
      ),
    });

    return { totalSize, chunks };
  }

  /**
   * Recommendations for bundle optimization
   */
  static getOptimizationTips(): string[] {
    const analysis = this.analyzeBundleSize();
    const tips: string[] = [];

    if (analysis.totalSize > 500000) { // 500KB
      tips.push('Consider code splitting for bundles over 500KB');
    }

    if (analysis.chunks.length < 3) {
      tips.push('Consider splitting vendor and app bundles');
    }

    const largeChunks = analysis.chunks.filter(c => c.size > 100000); // 100KB
    if (largeChunks.length > 0) {
      tips.push(`Large chunks detected: ${largeChunks.map(c => c.name).join(', ')}`);
    }

    return tips;
  }
}

/**
 * React component performance helpers
 */
export const withPerformanceMonitoring = <P extends object>(
  Component: React.ComponentType<P>,
  displayName?: string
) => {
  return function PerformanceMonitoredComponent(props: P) {
    const componentName = displayName || Component.displayName || Component.name;
    
    const monitor = new PerformanceMonitor();
    
    React.useEffect(() => {
      const renderStart = performance.now();
      
      return () => {
        const renderEnd = performance.now();
        Logger.debug('Component Lifecycle', {
          component: componentName,
          renderTime: `${(renderEnd - renderStart).toFixed(2)}ms`,
        });
      };
    }, [componentName]);

    return React.createElement(Component, props);
  };
};