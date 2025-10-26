import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

const Hero: React.FC = () => {
  const [splineLoaded, setSplineLoaded] = useState(false);

  useEffect(() => {
    // Load Spline viewer script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://unpkg.com/@splinetool/viewer@1.10.57/build/spline-viewer.js';
    script.onload = () => setSplineLoaded(true);
    document.head.appendChild(script);

    return () => {
      // Cleanup
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const scrollToSkills = () => {
    const skillsSection = document.getElementById('skills');
    skillsSection?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Spline Background */}
      <div className="absolute inset-0 z-0">
        {splineLoaded ? (
          <spline-viewer 
            url="https://prod.spline.design/AGbryKbHdYHneDBl/scene.splinecode"
            style={{ width: '100%', height: '100%' }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-900/20 via-black to-cyan-900/20 animate-pulse" />
        )}
      </div>

      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/40 z-10" />

      {/* Content */}
      <div className="relative z-20 text-center px-4 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.5 }}
          className="space-y-8"
        >
          <motion.h1 
            className="text-6xl md:text-8xl font-black bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent leading-tight"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.8, delay: 0.7 }}
          >
            THE LEGION
            <br />
            OF BROTHERS
          </motion.h1>

          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
          >
            Master the skills that define the future. Join an elite community of entrepreneurs, 
            traders, creators, and warriors building unstoppable legacies.
          </motion.p>

          <motion.div 
            className="flex flex-col sm:flex-row gap-6 justify-center items-center mt-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.5 }}
          >
            <button className="group relative px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full font-bold text-lg hover:scale-105 transition-transform duration-300 overflow-hidden">
              <span className="relative z-10">JOIN THE BROTHERHOOD</span>
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </button>
            
            <button className="px-8 py-4 border-2 border-cyan-400 text-cyan-400 rounded-full font-bold text-lg hover:bg-cyan-400 hover:text-black transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/25">
              BECOME AN INSTRUCTOR
            </button>
          </motion.div>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        onClick={scrollToSkills}
        className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20 text-cyan-400 hover:text-cyan-300 transition-colors duration-300"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        <ChevronDown size={32} />
      </motion.button>
    </section>
  );
};

export default Hero;