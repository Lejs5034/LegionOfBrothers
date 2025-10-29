import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Target, Shield, Zap } from 'lucide-react';

const Mission: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const values = [
    {
      icon: <Target size={32} />,
      title: "PRECISION",
      description: "Every skill mastered with surgical precision. No wasted time, only results.",
    },
    {
      icon: <Shield size={32} />,
      title: "BROTHERHOOD",
      description: "A community of warriors supporting each other's rise to greatness.",
    },
    {
      icon: <Zap size={32} />,
      title: "TRANSFORMATION",
      description: "Complete metamorphosis from ordinary to extraordinary, unstoppable brotherhood.",
    },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-black to-purple-900/20">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-5xl md:text-6xl font-black mb-8 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            initial={{ scale: 0.8 }}
            animate={inView ? { scale: 1 } : { scale: 0.8 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            OUR MISSION
          </motion.h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Mission Statement */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-8"
          >
            <div className="prose prose-xl text-gray-300 space-y-6">
              <p className="text-2xl md:text-3xl font-bold text-white leading-relaxed">
                We forge the <span className="text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text">unstoppable few</span> who will define tomorrow.
              </p>
              
              <p className="text-lg leading-relaxed">
                The Legion of Brothers isn't just a school—it's a brotherhood of high performers,
                entrepreneurs, and visionaries who refuse to settle for mediocrity. We don't just teach skills;
                we forge warriors equipped to dominate the future economy.
              </p>
              
              <p className="text-lg leading-relaxed">
                In a world of infinite distractions and shallow expertise, we provide deep mastery, 
                unbreakable community, and the mindset to turn knowledge into empire.
              </p>
            </div>

            <motion.div 
              className="p-6 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 rounded-2xl border border-cyan-500/20"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <h3 className="text-xl font-bold text-cyan-400 mb-3">OUR VISION</h3>
              <p className="text-gray-300">
                To build the largest community of high-performing individuals who leverage cutting-edge skills 
                to create generational wealth and unstoppable personal brands.
              </p>
            </motion.div>
          </motion.div>

          {/* Core Values */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-8"
          >
            <h3 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              CORE VALUES
            </h3>

            <div className="space-y-6">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ delay: 0.7 + (index * 0.1), duration: 0.6 }}
                  className="group flex items-start space-x-4 p-6 rounded-xl bg-gray-800/50 hover:bg-gradient-to-r hover:from-purple-500/10 hover:to-cyan-500/10 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                    {value.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                      {value.title}
                    </h4>
                    <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      {value.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Mission;