import React from 'react';

const ViewerList = ({ viewers = [] }) => {
  return (
    <div className="flex -space-x-2 overflow-hidden">
      {viewers.slice(0, 5).map((v, i) => (
        <img 
          key={i}
          className="inline-block h-6 w-6 rounded-full ring-2 ring-black bg-zinc-800"
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${v}`}
          alt="viewer"
        />
      ))}
      {viewers.length > 5 && (
        <div className="flex items-center justify-center h-6 w-6 rounded-full bg-zinc-900 ring-2 ring-black text-[8px] font-black text-white">
          +{viewers.length - 5}
        </div>
      )}
    </div>
  );
};

export default ViewerList;