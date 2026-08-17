import React, { useRef, useEffect } from 'react';

interface VideoStageProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  onTimeUpdate?: (time: number) => void;
  onPlay?: () => void;
  onPause?: () => void;
  onEnded?: () => void;
  onReady?: (video: HTMLVideoElement) => void;
}

export const VideoStage = React.forwardRef<HTMLVideoElement, VideoStageProps>(({
  src,
  poster,
  autoPlay = false,
  muted = false,
  loop = false,
  onTimeUpdate,
  onPlay,
  onPause,
  onEnded,
  onReady
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Expose videoRef to parent via imperative handle or forwardRef
  React.useImperativeHandle(ref, () => videoRef.current as HTMLVideoElement);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => onTimeUpdate?.(video.currentTime);
    const handlePlay = () => onPlay?.();
    const handlePause = () => onPause?.();
    const handleEnded = () => onEnded?.();
    const handleLoadedMetadata = () => onReady?.(video);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [onTimeUpdate, onPlay, onPause, onEnded, onReady]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      autoPlay={autoPlay}
      muted={muted}
      loop={loop}
      playsInline
      className="w-full h-full object-contain"
    />
  );
});
