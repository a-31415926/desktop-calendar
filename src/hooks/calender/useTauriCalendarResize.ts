import { invoke } from '@tauri-apps/api/core';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type RefObject, useLayoutEffect, useRef } from 'react';

/** 任务栏弹窗在 `setSize` 后按新高度重新贴边，防抖避免 ResizeObserver 连发 */
const REPOSITION_NEAR_TASKBAR_MS = 150;

/**
 * 将日历根节点的 CSS 逻辑像素尺寸同步给 Tauri 窗口。
 *
 * WebView 的 `offsetWidth` / `offsetHeight` 本身就是逻辑像素；这里直接使用 `LogicalSize`，
 * 由 Tauri 根据当前显示器 DPI 自动转换为物理像素，避免高 DPI 屏幕上重复乘缩放因子。
 */
export function useTauriCalendarResize(
  autoResizeWindow: boolean,
): RefObject<HTMLDivElement | null> {
  /** 挂载在日历最外层 div，供 ResizeObserver 测量 */
  const containerRef = useRef<HTMLDivElement | null>(null);
  const repositionTaskbarPopupTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!autoResizeWindow) {
      return;
    }
    const el = containerRef.current;
    if (!el) return;

    const appWindow = getCurrentWindow();
    let cancelled = false;
    let resizeFrame: number | null = null;
    let unlistenScaleChanged: (() => void) | undefined;

    const scheduleRepositionTaskbarPopup = (): void => {
      if (appWindow.label !== 'calendar') {
        return;
      }
      if (repositionTaskbarPopupTimerRef.current != null) {
        clearTimeout(repositionTaskbarPopupTimerRef.current);
      }
      repositionTaskbarPopupTimerRef.current = setTimeout(() => {
        repositionTaskbarPopupTimerRef.current = null;
        requestAnimationFrame(() => {
          void invoke('show_calendar').catch(() => {});
        });
      }, REPOSITION_NEAR_TASKBAR_MS);
    };

    const resizeWindow = async (): Promise<void> => {
      if (cancelled) return;

      // offsetWidth/offsetHeight 不受 V4 弹窗 transform 动画影响，适合作为稳定的布局尺寸来源。
      const width = Math.ceil(el.offsetWidth);
      const height = Math.ceil(el.offsetHeight);
      if (width <= 0 || height <= 100) {
        return;
      }

      // CSS/WebView 尺寸是逻辑像素。不要再手动乘 scaleFactor，交给 Tauri 做 DPI 换算。
      await appWindow.setSize(new LogicalSize(width, height));
      scheduleRepositionTaskbarPopup();
    };

    const scheduleResize = (): void => {
      if (cancelled) return;
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
      }
      resizeFrame = requestAnimationFrame(() => {
        resizeFrame = null;
        void resizeWindow().catch(() => {});
      });
    };

    const observer = new ResizeObserver(() => {
      scheduleResize();
    });

    observer.observe(el);
    scheduleResize();

    // Windows 改分辨率/缩放，或窗口进入不同 DPI 的显示器时，重新按逻辑像素同步尺寸。
    void appWindow
      .onScaleChanged(() => {
        scheduleResize();
      })
      .then((unlisten) => {
        if (cancelled) {
          unlisten();
        } else {
          unlistenScaleChanged = unlisten;
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      observer.disconnect();
      unlistenScaleChanged?.();
      if (resizeFrame !== null) {
        cancelAnimationFrame(resizeFrame);
        resizeFrame = null;
      }
      if (repositionTaskbarPopupTimerRef.current != null) {
        clearTimeout(repositionTaskbarPopupTimerRef.current);
        repositionTaskbarPopupTimerRef.current = null;
      }
    };
  }, [autoResizeWindow]);

  return containerRef;
}
