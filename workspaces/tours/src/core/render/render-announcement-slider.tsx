import type { FlowAnnouncementListStep } from "../../types";
import type { FlowState } from "../flow-state";
import { type AnnouncementItem, fetchAnnouncements, clearAnnouncementsCache } from "../announcement-service";
import { getApiUrl } from "../../cloud/api";
import { createRoot } from "./render-common";

const formatDate = (dateString: string | null): string => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const renderAnnouncementCard = (announcement: AnnouncementItem): HTMLElement => {
  return (
    <div className="flows-announcement-card">
      <div className="flows-announcement-card-header">
        {announcement.is_new && <span className="flows-announcement-badge">NEW</span>}
        <h3 className="flows-announcement-card-title">{announcement.title}</h3>
      </div>
      <div
        className="flows-announcement-card-content"
        dangerouslySetInnerHTML={{ __html: announcement.content }}
      />
      {announcement.published_at && (
        <div className="flows-announcement-card-date">{formatDate(announcement.published_at)}</div>
      )}
    </div>
  );
};

const renderLoadingState = (): HTMLElement => {
  return (
    <div className="flows-announcement-loading">
      <div className="flows-announcement-spinner" />
      <span>Loading announcements...</span>
    </div>
  );
};

const renderEmptyState = (message: string): HTMLElement => {
  return (
    <div className="flows-announcement-empty">
      <span>{message}</span>
    </div>
  );
};

interface RenderAnnouncementSliderElementParams {
  step: FlowAnnouncementListStep;
  root?: HTMLElement;
}

interface RenderAnnouncementSliderElementResult {
  root: HTMLElement;
  contentContainer: HTMLElement;
  loadAnnouncements: () => Promise<void>;
  cleanup: () => void;
}

export const renderAnnouncementSliderElement = ({
  step,
  root: _root,
}: RenderAnnouncementSliderElementParams): RenderAnnouncementSliderElementResult => {
  const root = _root ?? createRoot({ step });

  const position = step.sliderPosition ?? "right";
  const width = step.sliderWidth ?? "400px";
  const title = step.title ?? "What's New";
  const emptyMessage = step.emptyStateMessage ?? "No announcements available.";
  const apiUrl = step.apiUrl ?? getApiUrl();
  const limit = step.initialLimit ?? 10;
  const enablePagination = step.enablePagination ?? true;

  let currentPage = 1;
  let hasMore = true;
  let isLoading = false;

  const contentContainer = <div className="flows-announcement-content" /> as HTMLElement;

  const sliderWrapper = (
    <div
      className={[
        "flows-announcement-slider-wrapper",
        `flows-announcement-slider-${position}`,
      ].join(" ")}
    >
      <div className="flows-announcement-slider" style={`width: ${width};`}>
        <div className="flows-header">
          <div className="flows-announcement-header-text">
            <h1 className="flows-title">{title}</h1>
            {step.subtitle && <p className="flows-announcement-subtitle">{step.subtitle}</p>}
          </div>
          {!step.hideClose && <button aria-label="Close" className="flows-cancel flows-close-btn" />}
        </div>
        {contentContainer}
      </div>
    </div>
  );

  if (!step.hideOverlay) {
    const overlayClasses = ["flows-announcement-overlay"];
    if (step.closeOnOverlayClick !== false) {
      overlayClasses.push("flows-overlay-cancel");
    }
    root.appendChild(<div className={overlayClasses.join(" ")} />);
  }
  root.appendChild(sliderWrapper);

  const loadAnnouncements = async (): Promise<void> => {
    if (isLoading || (!hasMore && currentPage > 1)) return;

    isLoading = true;

    if (currentPage === 1) {
      contentContainer.innerHTML = "";
      contentContainer.appendChild(renderLoadingState());
    }

    try {
      const response = await fetchAnnouncements({
        apiUrl,
        organizationId: step.organizationId,
        page: currentPage,
        limit,
      });

      if (currentPage === 1) {
        contentContainer.innerHTML = "";
      } else {
        const loadingEl = contentContainer.querySelector(".flows-announcement-loading");
        if (loadingEl) loadingEl.remove();
      }

      if (response.data.length === 0 && currentPage === 1) {
        contentContainer.appendChild(renderEmptyState(emptyMessage));
      } else {
        response.data.forEach((announcement) => {
          contentContainer.appendChild(renderAnnouncementCard(announcement));
        });
      }

      hasMore = response.hasMore;
      currentPage += 1;
    } catch {
      if (currentPage === 1) {
        contentContainer.innerHTML = "";
        contentContainer.appendChild(renderEmptyState("Failed to load announcements."));
      }
    } finally {
      isLoading = false;
    }
  };

  const handleScroll = (): void => {
    if (!enablePagination || !hasMore || isLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = contentContainer;
    if (scrollTop + clientHeight >= scrollHeight - 100) {
      void loadAnnouncements();
    }
  };

  contentContainer.addEventListener("scroll", handleScroll);

  const cleanup = (): void => {
    contentContainer.removeEventListener("scroll", handleScroll);
    clearAnnouncementsCache();
  };

  return { root, contentContainer, loadAnnouncements, cleanup };
};

interface RenderAnnouncementSliderParams {
  root: HTMLElement;
  step: FlowAnnouncementListStep;
  state: FlowState;
}

interface RenderAnnouncementSliderResult {
  cleanup: () => void;
}

export const renderAnnouncementSlider = ({
  root,
  step,
}: RenderAnnouncementSliderParams): RenderAnnouncementSliderResult => {
  const { loadAnnouncements, cleanup } = renderAnnouncementSliderElement({
    step,
    root,
  });

  void loadAnnouncements();

  return { cleanup };
};
