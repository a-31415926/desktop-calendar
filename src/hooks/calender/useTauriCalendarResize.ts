import { invoke } from '@tauri-apps/api/core';
import { LogicalSize } from '@tauri-apps/api/dpi';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { type RefObject, useLayoutEffect, useRef } from 'react';

/** 任务栏弹窗在 `setSize` 后按新高度重新贴边，防抖避免 ResizeObserver 连发 */
const REPOSITION_NEAR_TASKBAR_MS = 150;
/** innerSize 与逻辑尺寸比较时允许的亚像素误差。 */
const INNER_SIZE_TOLERANCE_PX = 0.75;

/**
 * 将日历根节点的 CSS 逻辑像素尺寸同步给 Tauri 窗口。
 *
 * 先用 LogicalSize 让 Tauri 自己处理 DPI；随后再读取真实 innerSize 做一次校正，
 * 避免不同 Windows / WebView2 / 显示器组合下外框占用造成底部内容被裁切。
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

    const measureContentLogicalSize = (): { width: number; height: number } => {
      const rect = el.getBoundingClientRect();
      // scrollHeight/scrollWidth 能把被当前 WebView 视口裁掉的真实内容也算进去。
      const width = Math.ceil(Math.max(el.offsetWidth, el.scrollWidth, rect.width));
      const height = Math.ceil(Math.max(el.offsetHeight, el.scrollHeight, rect.height));
      return { width, height };
    };

    const resizeWindow = async (): Promise<void> => {
      if (cancelled) return;

      const desired = measureContentLogicalSize();
      if (desired.width <= 0 || desired.height <= 100) {
        return;
      }

      // 第一步：按 CSS 逻辑像素设置尺寸，由 Tauri 负责 DPI 换算。
      await appWindow.setSize(new LogicalSize(desired.width, desired.height));
      if (cancelled) return;

      // 第二步：校验真实 WebView innerSize。某些高 DPI 组合下 setSize 后内部可用区会略小，
      // 这里把差额补回去，避免出现纵向滚动条或底部页脚被任务栏截住。
      try {
        const [innerSize, scaleFactor] = await Promise.all([
          appWindow.innerSize(),
          appWindow.scaleFactor(),
        ]);
        const innerLogicalWidth = innerSize.width / scaleFactor;
        const innerLogicalHeight = innerSize.height / scaleFactor;
        const widthDeficit = Math.max(0, desired.width - innerLogicalWidth);
        const heightDeficit = Math.max(0, desired.height - innerLogicalHeight);

        if (
          widthDeficit > INNER_SIZE_TOLERANCE_PX ||
          heightDeficit > INNER_SIZE_TOLERANCE_PX
        ) {
          await appWindow.setSize(
            new LogicalSize(
              Math.ceil(desired.width + widthDeficit),
              Math.ceil(desired.height + heightDeficit),
            ),
          );
        }
      } catch {
        // 极端情况下读取 innerSize 失败时保留第一步结果，不阻断弹窗使用。
      }

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

    // 字体真正就绪后再测一次，避免首帧字体替换后高度增长但窗口仍停留在旧尺寸。
    if (document.fonts?.ready) {
      void document.fonts.ready.then(() => {
        scheduleResize();
      });
    }

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
