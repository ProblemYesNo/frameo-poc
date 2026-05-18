import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import './App.css';

type ImageItem = {
  id: string;
  title: string;
  tags: string[];
  url: string;
  createdAt: string;
};

type SocketEvent = {
  type: 'image.created';
  data: ImageItem;
};

const API_BASE = 'http://localhost:5295';
const WS_BASE = API_BASE.replace(/^http/, 'ws');

const prependIfMissing = (
  items: ImageItem[],
  incoming: ImageItem,
): ImageItem[] => {
  if (items.some((item) => item.id === incoming.id)) {
    return items;
  }

  return [incoming, ...items];
};

function App() {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [title, setTitle] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [selectedTag, setSelectedTag] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial images on mount
  useEffect(() => {
    const fetchImages = async () => {
      try {
        const response = await axios.get<ImageItem[]>(`${API_BASE}/api/images`);
        setImages(response.data);
      } catch {
        setError('Could not load feed from API.');
      }
    };

    fetchImages().catch(() => setError('Could not load feed from API.'));
  }, []);

  // Establish websocket connection for live updates
  useEffect(() => {
    let socket: WebSocket | null = null;
    let connectTimer: ReturnType<typeof setTimeout> | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const clearConnectTimer = () => {
      if (connectTimer !== null) {
        clearTimeout(connectTimer);
        connectTimer = null;
      }
    };

    const clearReconnectTimer = () => {
      if (reconnectTimer !== null) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };

    const closeSocket = () => {
      if (socket && socket.readyState < WebSocket.CLOSED) {
        socket.close();
      }
      socket = null;
    };

    const connectWebSocket = () => {
      if (!active) return;

      closeSocket();

      try {
        socket = new WebSocket(`${WS_BASE}/ws`);

        socket.onopen = () => {
          console.log('WebSocket connected');
          setError('');
        };

        socket.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data) as SocketEvent;
            if (payload.type !== 'image.created') return;
            setImages((previous) => prependIfMissing(previous, payload.data));
          } catch (e) {
            console.error('Failed to parse websocket message:', e);
            setError('Received malformed websocket payload.');
          }
        };

        socket.onerror = (event) => {
          if (!socket || socket.readyState > 1) return;
          console.error('WebSocket error:', event);
          setError('WebSocket connection error. Retrying...');
        };

        socket.onclose = () => {
          console.log('WebSocket closed');
          if (active) {
            console.log('Reconnecting in 3s...');
            clearReconnectTimer();
            reconnectTimer = setTimeout(() => {
              if (active) connectWebSocket();
            }, 3000);
          }
        };
      } catch (e) {
        console.error('Failed to create WebSocket:', e);
        setError(`WebSocket connection failed: ${String(e)}`);
      }
    };

    const scheduleConnect = (delay = 0) => {
      if (!active) return;
      clearConnectTimer();
      connectTimer = setTimeout(() => {
        if (!active) return;
        connectWebSocket();
      }, delay);
    };

    scheduleConnect();

    return () => {
      active = false;
      clearConnectTimer();
      clearReconnectTimer();
      closeSocket();
    };
  }, []);

  const uniqueTags = useMemo(() => {
    return [
      ...new Set(
        images
          .flatMap((item) => item.tags || [])
          .filter((tag) => typeof tag === 'string' && tag.trim().length > 0),
      ),
    ].sort((a, b) => a.localeCompare(b));
  }, [images]);

  const visibleImages = useMemo(() => {
    if (!selectedTag) return images;
    return images.filter((item) => {
      const tags = item.tags || (item as ImageItem).tags || [];
      return tags.includes(selectedTag);
    });
  }, [images, selectedTag]);

  const onSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!file) {
      setError('Please choose an image to upload.');
      return;
    }

    setError('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('tags', tagsInput);
    formData.append('image', file);

    try {
      const response = await axios.post<ImageItem>(
        `${API_BASE}/uploads`,
        formData,
      );
      console.log('Upload response:', response.data);
      setImages((previous) => prependIfMissing(previous, response.data));

      setTitle('');
      setTagsInput('');
      setFile(null);
      const input = document.getElementById(
        'image-file',
      ) as HTMLInputElement | null;
      if (input) input.value = '';
    } catch (uploadError: unknown) {
      if (axios.isAxiosError(uploadError)) {
        const apiMessage = (
          uploadError.response?.data as { error?: string } | undefined
        )?.error;
        setError(apiMessage ?? 'Upload failed. Please try again.');
      } else {
        setError('Upload failed. Please try again.');
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 py-10 md:px-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="rounded-3xl border border-white/40 bg-white/70 p-6 shadow-lg backdrop-blur md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Frameo
          </p>
          <h1 className="mt-2 text-4xl font-black text-slate-900 md:text-5xl">
            Live Anonymous Image Feed
          </h1>
          <p className="mt-4 max-w-3xl text-base text-slate-700">
            Upload images with tags and watch the feed update in realtime via
            websocket.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <form
            onSubmit={onSubmit}
            className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-2xl font-bold text-slate-900">Upload</h2>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Title
              </span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:ring"
                placeholder="Evening at the lake"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Tags (comma separated)
              </span>
              <input
                value={tagsInput}
                onChange={(event) => setTagsInput(event.target.value)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none ring-cyan-500 transition focus:ring"
                placeholder="sunset, travel, summer"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">
                Image
              </span>
              <input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
                required
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
            </label>

            <button
              type="submit"
              disabled={isUploading}
              className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-500"
            >
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </button>

            {error && (
              <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </p>
            )}
          </form>

          <section className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-4">
                <h2 className="text-xl font-bold text-slate-900">Feed</h2>
                {selectedTag && (
                  <button
                    onClick={() => setSelectedTag('')}
                    className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700"
                  >
                    Clear Filter
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {uniqueTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                      selectedTag === tag
                        ? 'bg-slate-900 text-white'
                        : 'border border-slate-300 bg-white text-slate-700 hover:border-cyan-600 hover:text-cyan-700'
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {visibleImages.map((image) => {
                if (!image || !image.url) {
                  console.warn('Invalid image data:', image);
                  return null;
                }

                const isExternalUrl =
                  image.url.startsWith('http://') ||
                  image.url.startsWith('https://');
                const imageSrc = isExternalUrl
                  ? image.url
                  : `${API_BASE}${image.url}`;

                return (
                  <article
                    key={image.id}
                    className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                  >
                    <img
                      src={imageSrc}
                      alt={image.title}
                      className="h-52 w-full object-cover"
                      loading="lazy"
                    />
                    <div className="space-y-3 p-4">
                      <h3 className="text-lg font-bold text-slate-900">
                        {image.title}
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(image.tags ?? []).map((tag) => (
                          <span
                            key={`${image.id}-${tag}`}
                            className="rounded-full bg-cyan-100 px-2 py-1 text-xs font-semibold text-cyan-700"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {visibleImages.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm text-slate-600">
                No images found for this filter yet.
              </p>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}

export default App;
