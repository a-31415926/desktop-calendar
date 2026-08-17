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

// V9 使用 Web Animations API 强制关键帧播放，避免 Tauri show() 与 React/CSS 首帧合并后动画被“吃掉”。
// 整个日历保持完整形状，只做短距离、纯垂直位移与非常轻的透明度变化。
const POPUP_ENTER_MS = 240;
const POPUP_EXIT_MS = 167;
const POPUP_OFFSET_PX = 12;
const POPUP_ENTER_OPACITY = 0.94;
const POPUP_EXIT_OPACITY = 0.96;

const PopupWindow = (): ReactElement => {
  const readyCalled = useRef(false);
  const { data } = useConfigSync();
  const { isWindowsEffect: windowTransparency, macosEffect: windowEffect } = data;
  const [popupInteractive, setPopupInteractive] = useState(false);
  const popupVisibleRef = useRef(false);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<Animation | null>(null);
  const enterFrameRef = useRef<number | null>(null);
  const pendingAfterHideRef = useRef<PopupHideRequestDetail['after']>(undefined);

  const clearPendingAnimation = useCallback((): void => {
    if (enterFrameRef.current !== null) {
      cancelAnimationFrame(enterFrameRef.current);
      enterFrameRef.current = null;
    }
    animationRef.current?.cancel();
    animationRef.current = null;
  }, []);

  const startEnter = useCallback((): void => {
    if (popupVisibleRef.current && animationRef.current === null) return;

    clearPendingAnimation();
    pendingAfterHideRef.current = undefined;
    popupVisibleRef.current = true;
    setPopupInteractive(true);

    const surface = surfaceRef.current;
    if (!surface) return;

    const animation = surface.animate(
      [
        {
          transform: `translate3d(0, ${POPUP_OFFSET_PX}px, 0)`,
          opacity: POPUP_ENTER_OPACITY,
        },
        { transform: 'translate3d(0, 0, 0)', opacity: 1 },
      ],
      {
        duration: POPUP_ENTER_MS,
        easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
        fill: 'both',
      },
    );

    // 先把首关键帧钉住两个绘制帧，确保原生窗口 show 后 WebView 真正显示到“起点”，再开始直线上移。
    animation.pause();
    animation.currentTime = 0;
    animationRef.current = animation;

    enterFrameRef.current = requestAnimationFrame(() => {
      enterFrameRef.current = requestAnimationFrame(() => {
        enterFrameRef.current = null;
        if (popupVisibleRef.current && animationRef.current === animation) {
          animation.play();
        }
      });
    });

    void animation.finished
      .then(() => {
        if (animationRef.current === animation) {
          animationRef.current = null;
          animation.cancel();
        }
      })
      .catch(() => {});
  }, [clearPendingAnimation]);

  const startExit = useCallback(
    (after?: PopupHideRequestDetail['after']): void => {
      pendingAfterHideRef.current = after ?? pendingAfterHideRef.current;
      if (!popupVisibleRef.current && animationRef.current !== null) return;

      clearPendingAnimation();
      popupVisibleRef.current = false;
      setPopupInteractive(false);

      const surface = surfaceRef.current;
      const appWindow = getCurrentWindow();
      if (!surface) {
        void appWindow.hide();
        return;
      }

      const computed = window.getComputedStyle(surface);
      const currentTransform = computed.transform === 'none' ? 'translate3d(0, 0, 0)' : computed.transform;
      const currentOpacity = Number.parseFloat(computed.opacity) || 1;
      const animation = surface.animate(
        [
          { transform: currentTransform, opacity: currentOpacity },
          {
            transform: `translate3d(0, ${POPUP_OFFSET_PX}px, 0)`,
            opacity: POPUP_EXIT_OPACITY,
          },
        ],
        {
          duration: POPUP_EXIT_MS,
          easing: 'cubic-bezier(0.7, 0, 1, 0.5)',
          fill: 'both',
        },
      );
      animationRef.current = animation;

      void animation.finished
        .then(async () => {
          if (popupVisibleRef.current || animationRef.current !== animation) return;

          const afterHide = pendingAfterHideRef.current;
          pendingAfterHideRef.current = undefined;
          animationRef.current = null;
          try {
            await appWindow.hide();
            animation.cancel();
            if (afterHide === 'open-main') {
              await invoke('open_main_window');
            }
          } catch (error) {
            animation.cancel();
            console.error('popup exit animation failed', error);
          }
        })
        .catch(() => {});
    },
    [clearPendingAnimation],
  );

  useEffect(() => {
    if (isWindows) {
      void getCurrentWindow().setShadow(false);
    }
  }, []);

  // 任务栏 Flyout 不应该出现浏览器滚动条。真实内容尺寸由 useTauriCalendarResize 负责。
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const root = document.getElementById('root');
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousRootOverflow = root?.style.overflow ?? '';

    html.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (root) root.style.overflow = 'hidden';

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      if (root) root.style.overflow = previousRootOverflow;
    };
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
        console.error('popup animation listener failed', error);
      }
    })();

    return () => {
      cancelled = true;
      window.removeEventListener(popupHideRequestEvent, handleBrowserHideRequest);
      unlistenShow?.();
      unlistenHide?.();
      clearPendingAnimation();
    };
  }, [clearPendingAnimation, startEnter, startExit]);

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

  useWindowCornerMask();

  useEffect(() => {
    invoke('set_macos_vibrancy', {
      enabled: windowTransparency,
      effect: windowEffect,
    }).catch(console.error);
  }, [windowEffect, windowTransparency]);

  const surfaceStyle: CSSProperties = {
    transform: 'translate3d(0, 0, 0)',
    opacity: 1,
    willChange: 'transform, opacity',
    pointerEvents: popupInteractive ? 'auto' : 'none',
  };

  const calendarStyle = {
    '--calendar-radius': `${WINDOW_RADIUS}px`,
    '--calendar-shadow': 'none',
  } as CSSProperties;

  return (
    <div ref={surfaceRef} style={surfaceStyle}>
      <CalendarView
        transparent={isWindows ? windowTransparency : true}
        backgroundOpacity={windowTransparency ? 72 : 100}
        style={calendarStyle}
      />
    </div>
  );
};

export default PopupWindow;
