import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users, Award, BookOpen, ArrowRight } from 'lucide-react';

const CallToAction: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [isHovered, setIsHovered] = useState(false);

  const benefits = [
    {
      icon: <Users size={24} />,
      title: "Brotherhood Network Access",
      description: "Connect with top-tier entrepreneurs and industry leaders",
    },
    {
      icon: <Award size={24} />,
      title: "Revenue Sharing",
      description: "Earn substantial income teaching what you've mastered",
    },
    {
      icon: <BookOpen size={24} />,
      title: "Curriculum Support",
      description: "Full resources and support to create impactful courses",
    },
  ];

  return (
    <section className="py-24 px-4 bg-gradient-to-br from-black via-purple-900/20 to-cyan-900/10">
      <div className="max-w-6xl mx-auto">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            initial={{ scale: 0.8 }}
            animate={inView ? { scale: 1 } : { scale: 0.8 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            BECOME AN INSTRUCTOR
          </motion.h2>
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Are you a master in your field? Join our brotherhood of faculty and help forge the next generation
            of unstoppable leaders while building your own legacy.
          </motion.p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Benefits */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-8"
          >
            <h3 className="text-3xl md:text-4xl font-bold mb-8 text-white">
              Why <span className="text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text">Legendary</span> Instructors Choose Us
            </h3>

            <div className="space-y-6">
              {benefits.map((benefit, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ delay: 0.5 + (index * 0.1), duration: 0.6 }}
                  className="flex items-start space-x-4 p-6 rounded-xl bg-gradient-to-r from-gray-800/50 to-gray-700/30 hover:from-cyan-500/10 hover:to-purple-600/10 transition-all duration-300 hover:scale-105 group cursor-pointer"
                >
                  <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-cyan-500 to-purple-600 group-hover:scale-110 transition-transform duration-300">
                    {benefit.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                      {benefit.title}
                    </h4>
                    <p className="text-gray-400 group-hover:text-gray-300 transition-colors duration-300">
                      {benefit.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div 
              className="p-6 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl border border-purple-500/20"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <h4 className="text-lg font-bold text-purple-400 mb-2">REQUIREMENTS</h4>
              <p className="text-gray-300 text-sm">
                • Proven expertise in Business, Crypto Trading, Copywriting, or Fitness<br />
                • Track record of success and results<br />
                • Passion for teaching and mentoring high-achievers<br />
                • Commitment to excellence and continuous improvement
              </p>
            </motion.div>
          </motion.div>

          {/* Application CTA */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-center"
          >
            <motion.div 
              className="relative p-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-gray-700 hover:border-cyan-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-cyan-500/10"
              whileHover={{ scale: 1.02 }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
            >
              <motion.div
                animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
                transition={{ duration: 0.8 }}
                className="inline-flex p-6 rounded-full bg-gradient-to-br from-cyan-500 to-purple-600 mb-8"
              >
                <ArrowRight size={48} className="text-white" />
              </motion.div>

              <h3 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                APPLY TODAY
              </h3>

              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                Join an exclusive group of world-class instructors shaping the future. 
                Your expertise + our platform = Unstoppable impact.
              </p>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative w-full py-6 px-8 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-2xl font-bold text-xl text-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25"
              >
                <span className="relative z-10 flex items-center justify-center space-x-3">
                  <span>SUBMIT APPLICATION</span>
                  <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>

              <p className="text-sm text-gray-500 mt-6">
                Applications reviewed within 48 hours • Exclusive opportunity
              </p>

              {/* Decorative elements */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-cyan-500/30" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-purple-500/30" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-purple-500/30" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-cyan-500/30" />
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default CallToAction;