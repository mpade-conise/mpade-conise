import React, { useEffect, useRef } from 'react';

const setRef = (ref, value) => {
  if (!ref) return;
  if (typeof ref === 'function') ref(value);
  else ref.current = value;
};

const attachStream = (node, stream) => {
  if (!node) return;
  if (node.srcObject !== stream) node.srcObject = stream || null;
  if (stream) {
    const play = node.play?.();
    if (play?.catch) play.catch(() => {});
  }
};

const VideoSlot = ({ stream, children }) => {
  const internalRef = useRef(null);

  useEffect(() => {
    attachStream(internalRef.current, stream);
    return () => {
      if (internalRef.current) internalRef.current.srcObject = null;
    };
  }, [stream]);

  if (React.isValidElement(children)) {
    const originalRef = children.ref;
    return React.cloneElement(children, {
      ref: node => {
        internalRef.current = node;
        setRef(originalRef, node);
      }
    });
  }

  return <video ref={internalRef} autoPlay playsInline muted className="w-full h-full object-cover" />;
};

const DynamicStreamGrid = ({ hostVideo, coHostVideo, hostInfo, coHostInfo, coHosts = [], coHostStreams = [], coHostStream = null, isHostView = false, isBattleMode = false }) => {
  const streams = coHostStreams.length ? coHostStreams : coHostStream ? [coHostStream] : [];
  const hasRemote = streams.length > 0 && coHostVideo;

  if (hasRemote) {
    return (
      <div className="grid h-full w-full grid-cols-2 gap-0 bg-black">
        <div className="relative min-h-0 overflow-hidden">{hostVideo}</div>
        <div className="relative min-h-0 overflow-hidden">
          <VideoSlot stream={streams[0]}>{coHostVideo}</VideoSlot>
        </div>
      </div>
    );
  }

  return <div className="relative h-full w-full bg-black">{hostVideo}</div>;
};

export default DynamicStreamGrid;
