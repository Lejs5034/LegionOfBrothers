import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { TrendingUp, DollarSign, PenTool, Dumbbell } from 'lucide-react';

const Skills: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const skills = [
    {
      icon: <TrendingUp size={48} />,
      title: "Business Mastery",
      description: "Build, scale, and dominate markets with proven strategies from industry titans.",
      gradient: "from-cyan-400 to-blue-600",
      bgGradient: "from-cyan-500/10 to-blue-600/10",
    },
    {
      icon: <DollarSign size={48} />,
      title: "Crypto Trading",
      description: "Navigate digital markets with precision and generate wealth in the new economy.",
      gradient: "from-green-400 to-emerald-600",
      bgGradient: "from-green-500/10 to-emerald-600/10",
    },
    {
      icon: <PenTool size={48} />,
      title: "Copywriting",
      description: "Master the art of persuasion and turn words into profits with compelling content.",
      gradient: "from-purple-400 to-pink-600",
      bgGradient: "from-purple-500/10 to-pink-600/10",
    },
    {
      icon: <Dumbbell size={48} />,
      title: "Fitness",
      description: "Forge an unbreakable body and mind. Peak performance starts with peak health.",
      gradient: "from-orange-400 to-red-600",
      bgGradient: "from-orange-500/10 to-red-600/10",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut",
      },
    },
  };

  return (
    <section id="skills" className="py-24 px-4 bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="max-w-7xl mx-auto">
        <motion.div
          ref={ref}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={containerVariants}
          className="text-center mb-16"
        >
          <motion.h2 
            className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent"
            variants={itemVariants}
          >
            FORGE YOUR FUTURE
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-300 max-w-3xl mx-auto"
            variants={itemVariants}
          >
            Master the four pillars of modern success. These aren't just skills—they're weapons for dominating the future.
          </motion.p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
        >
          {skills.map((skill, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              className={`group relative p-8 rounded-2xl bg-gradient-to-br ${skill.bgGradient} border border-gray-800 hover:border-transparent hover:shadow-2xl transition-all duration-500 hover:scale-105`}
              style={{
                background: `linear-gradient(135deg, ${skill.bgGradient.split(' ')[1]}, ${skill.bgGradient.split(' ')[3]})`,
              }}
            >
              <div className={`inline-flex p-4 rounded-xl bg-gradient-to-br ${skill.gradient} mb-6 group-hover:scale-110 transition-transform duration-300`}>
                {skill.icon}
              </div>
              
              <h3 className="text-2xl font-bold mb-4 text-white group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                {skill.title}
              </h3>
              
              <p className="text-gray-400 leading-relaxed group-hover:text-gray-300 transition-colors duration-300">
                {skill.description}
              </p>

              {/* Hover glow effect */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${skill.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 -z-10`} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default Skills;