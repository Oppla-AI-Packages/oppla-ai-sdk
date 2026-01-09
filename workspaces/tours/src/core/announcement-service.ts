export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
  published_at: string | null;
  is_new: boolean;
}

export interface FetchAnnouncementsParams {
  apiUrl: string;
  organizationId: string;
  page?: number;
  limit?: number;
}

export interface FetchAnnouncementsResponse {
  data: AnnouncementItem[];
  hasMore: boolean;
}

// Cache for announcements to prevent duplicate fetches
const announcementsCache = new Map<string, { data: AnnouncementItem[]; timestamp: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export const fetchAnnouncements = async ({
  apiUrl,
  organizationId,
  page = 1,
  limit = 10,
}: FetchAnnouncementsParams): Promise<FetchAnnouncementsResponse> => {
  const cacheKey = `${organizationId}-${page}-${limit}`;
  const cached = announcementsCache.get(cacheKey);

  // Return cached data if valid
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return {
      data: cached.data,
      hasMore: cached.data.length >= limit,
    };
  }

  try {
    const url = `${apiUrl}/organizations/${organizationId}/announcements?status=published`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch announcements: ${response.statusText}`);
    }

    const data = (await response.json()) as AnnouncementItem[];

    // Cache the results
    announcementsCache.set(cacheKey, { data, timestamp: Date.now() });

    return {
      data,
      hasMore: data.length >= limit,
    };
  } catch (error) {
    console.error("Error fetching announcements:", error);
    return {
      data: [],
      hasMore: false,
    };
  }
};

export const clearAnnouncementsCache = (): void => {
  announcementsCache.clear();
};
