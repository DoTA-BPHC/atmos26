import React from 'react';
import { motion } from 'framer-motion';

export interface TiltedGalleryProps {
  /** Array of image URLs to display in the scrolling gallery */
  images: string[];
  /** Duration in seconds for one full loop scroll cycle (default: 30) */
  duration?: number;
  /** Rotate Y angle in degrees for the 3D perspective tilt (default: 20) */
  tiltAngle?: number;
  /** Perspective distance in pixels (default: 1200) */
  perspective?: number;
  /** Custom CSS class names for the outer container */
  className?: string;
}

export const TiltedGallery: React.FC<TiltedGalleryProps> = ({
  images,
  duration = 30,
  tiltAngle = 20,
  perspective = 1200,
  className = '',
}) => {
  return (
    <div className={`relative w-full overflow-hidden py-12 select-none ${className}`}>
      {/* 3D Tilted Perspective Container */}
      <div
        className="w-full flex justify-center items-center py-6"
        style={{
          transform: `perspective(${perspective}px) rotateY(${tiltAngle}deg)`,
          transformStyle: 'preserve-3d',
        }}
      >
        {/* Infinite Horizontal Sliding Track */}
        <motion.div
          className="flex flex-row items-center gap-6 w-max"
          animate={{ x: ['0%', '-50%'] }}
          transition={{
            duration: duration,
            ease: 'linear',
            repeat: Infinity,
          }}
        >
          {/* Primary Set of Images */}
          <div className="flex flex-row items-center gap-6 shrink-0">
            {images.map((src, index) => (
              <div
                key={`primary-${index}`}
                className="relative shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group transition-all duration-300 hover:scale-[1.03] bg-neutral-900"
              >
                <img
                  src={src}
                  alt={`Gallery image ${index + 1}`}
                  loading="lazy"
                  className="h-60 sm:h-80 md:h-96 w-auto max-w-none object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            ))}
          </div>

          {/* Duplicated Set of Images for Infinite Looping (Aria Hidden) */}
          <div className="flex flex-row items-center gap-6 shrink-0" aria-hidden="true">
            {images.map((src, index) => (
              <div
                key={`duplicate-${index}`}
                className="relative shrink-0 rounded-2xl overflow-hidden shadow-2xl border border-white/10 group transition-all duration-300 hover:scale-[1.03] bg-neutral-900"
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="h-60 sm:h-80 md:h-96 w-auto max-w-none object-contain rounded-2xl transition-transform duration-500 group-hover:scale-[1.02]"
                />
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TiltedGallery;
