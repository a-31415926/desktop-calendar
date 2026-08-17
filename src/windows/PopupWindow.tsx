import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import CalendarView from '../components/calendar/CalendarView.tsx';
import { WINDOW_RADIUS } from '../constants/window.ts';
import { useWindowCornerMask } from '../hooks/useWindowCornerMask.ts';
import { useConfigSync } from '../sync/configStore.ts';
import { isWindows } from '../utils/platform.ts';
import {
  popupHideRequestEvent,
  type PopupHideRequestDetail,
} from '../utils/tauriUtils.ts';

const POPUP_ENTER_MS = 160;
const POPUP_EXIT_MS = 120;

const PopupWindow = (): ReactElement => {
  const readyCalled = useRef(false);
  const { data } = useConfigSync();
  const { isWindowsEffect: windowTransparency, macosEffect: windowEffect } = data;
  const [popupVisible, setPopupVisible] = useState(false);
  const popupVisibleRef = useRef(false);
  const enterFrameRef = useRef<number | null>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAfterHideRef = useRef<PopupHideRequestDetail['after']>();

  const clearPendingTransition = useCallback((): void => {
    if (enterFrameRef.current !== null) {
      cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const startEnter = useCallback((): void => {
    if (popupVisibleRef.current) return;
    clearPendingTransition();
    pendingAfterHideRef.current = undefined;
    popupVisibleRef.current = true;

    // 等窗口真正进入可见帧后再切到最终状态，确保每次 show 都有完整过渡。
    enterFrameRef.current = requestAnimationFrame(() => {
      enterFrameRef.current = null;
      setPopupVisible(true);
    });
  }, [clearPendingTransition]);

  const startExit = useCallback(
    (after?: PopupHideRequestDetail['after']): void => {
      pendingAfterHideRef.current = after ?? pendingAfterHideRef.current;
      if (!popupVisibleRef.current && hideTimerRef.current !== null) return;

      clearPendingTransition();
      popupVisibleRef.current = false;
      setPopupVisible(false);

      hideTimerRef.current = setTimeout(() => {
        hideTimerRef.current = null;
        const afterHide = pendingAfterHideRef.current;
        pendingAfterHideRef.current = undefined;
        const appWindow = getCurrentWindow();

        void (async () => {
          try {
            await appWindow.hide();
            if (afterHide === 'open-main') {
              await invoke('open_main_window');
            }
          } catch (error) {
            console.error('popup exit transition failed', error);
          }
        })();
      }, POPUP_EXIT_MS);
    },
    [clearPendingTransition],
  );

  useEffect(() => {
    if (isWindows) {
      void getCurrentWindow().setShadow(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unlistenShow: (() => void) | undefined;
    let unlistenHide: (() => void) | undefined;

    const handleBrowserHideRequest = (event: Event): void => {
      const detail = (event as CustomEvent<PopupHideRequestDetail>).detail;
      startExit(detail?.after);
    };

    window.addEventListener(popupHideRequestEvent, handleBrowserHideRequest);

    void (async () => {
      try {
        const removeShow = await listen('calendar-popup-show', () => startEnter());
        if (cancelled) removeShow();
        else unlistenShow = removeShow;

        const removeHide = await listen('calendar-popup-hide', () => startExit());
        if (cancelled) removeHide();
        else unlistenHide = removeHide;
      } catch (error) {
        console.error('popup transition listener failed', error);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(popupHideRequestEvent, handleBrowserHideRequest);
      unlistenShow?.();
      unlistenHide?.();
      clearPendingTransition();
    };
  }, [clearPendingTransition, startEnter, startExit]);

  useEffect(() => {
    if (readyCalled.current) return;

    const appWindow = getCurrentWindow();
    let unlistenResize: (() => void) | undefined;
    let resizeObserver: ResizeObserver | null = null;
    let fallbackTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const fireReady = (): void => {
      if (cancelled || readyCalled.current) return;
      readyCalled.current = true;
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
        fallbackTimer = undefined;
      }
      unlistenResize?.();
      resizeObserver?.disconnect();
      // 后端完成首次 show 后再兜底触发一次 enter，避免极端情况下事件监听尚未注册。
      void invoke('popup_ready').then(startEnter).catch(console.error);
    };

    const tryFireWhenSized = async (): Promise<void> => {
      if (cancelled || readyCalled.current) return;
      try {
        const size = await appWindow.innerSize();
        if (size.width > 0 && size.height > 100) {
          fireReady();
        }
      } catch {
        // ignore
      }
    };

    void (async () => {
      try {
        unlistenResize = await appWindow.onResized(() => {
          void tryFireWhenSized();
        });
        if (cancelled) {
          unlistenResize();
        }
      } catch {
        // ignore
      }
    })();

    const root = document.getElementById('root');
    if (root) {
      resizeObserver = new ResizeObserver(() => {
        void tryFireWhenSized();
      });
      resizeObserver.observe(root);
    }

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        void tryFireWhenSized();
      });
    });

    // 与原先「轮询结束必发」一致：极端情况下尺寸事件未触发时仍解锁后端挂起的展示
    fallbackTimer = setTimeout(() => {
      fireReady();
    }, 450);

    return () => {
      cancelled = true;
      if (fallbackTimer !== undefined) {
        clearTimeout(fallbackTimer);
      }
      unlistenResize?.();
      resizeObserver?.disconnect();
    };
  }, [startEnter]);

  // 统一应用前端圆角遮罩
  useWindowCornerMask();

  useEffect(() => {
    invoke('set_macos_vibrancy', {
      enabled: windowTransparency,
      effect: windowEffect,
    }).catch(console.error);
  }, [windowEffect, windowTransparency]);

  const transitionStyle: CSSProperties = {
    opacity: popupVisible ? 1 : 0,
    transform: popupVisible
      ? 'translate3d(0, 0, 0) scale(1)'
      : 'translate3d(0, 8px, 0) scale(0.985)',
    transformOrigin: 'bottom right',
    transition: popupVisible
      ? `opacity ${POPUP_ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${POPUP_ENTER_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`
      : `opacity ${POPUP_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1), transform ${POPUP_EXIT_MS}ms cubic-bezier(0.4, 0, 1, 1)`,
    willChange: 'opacity, transform',
    pointerEvents: popupVisible ? 'auto' : 'none',
  };

  return (
    <div style={transitionStyle}>
      <CalendarView
        transparent={isWindows ? windowTransparency : true}
        backgroundOpacity={windowTransparency ? 72 : 100}
        style={
          {
            '--calendar-radius': `${WINDOW_RADIUS}px`,
            '--calendar-shadow': 'none',
          } as CSSProperties
        }
      />
    </div>
  );
};

export default PopupWindow;
