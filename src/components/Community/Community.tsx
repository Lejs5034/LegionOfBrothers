import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Users2, Flame, Crown, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Community: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [memberCount, setMemberCount] = useState<number>(0);

  useEffect(() => {
    const fetchMemberCount = async () => {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (!error && count !== null) {
        setMemberCount(count);
      }
    };

    fetchMemberCount();

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          setMemberCount((prev) => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const stats = [
    {
      icon: <Users2 size={32} />,
      number: "10K+",
      label: "Elite Members",
      gradient: "from-cyan-400 to-blue-600",
    },
    {
      icon: <Flame size={32} />,
      number: "97%",
      label: "Success Rate",
      gradient: "from-orange-400 to-red-600",
    },
    {
      icon: <Crown size={32} />,
      number: "50+",
      label: "Master Instructors",
      gradient: "from-purple-400 to-pink-600",
    },
    {
      icon: <Zap size={32} />,
      number: "$2M+",
      label: "Generated Revenue",
      gradient: "from-green-400 to-emerald-600",
    },
  ];


  return (
    <section className="py-24 px-4 bg-gradient-to-br from-gray-900 via-black to-purple-900/20">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
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
            Join the Brotherhood
          </motion.h2>
          <motion.p 
            className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Become part of a brotherhood that's redefining success. Where ambition meets execution, 
            and ordinary transforms into legendary.
          </motion.p>
        </motion.div>

        {/* Stats */}
        <motion.div
          className="flex justify-center mb-20"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 0.3, duration: 0.8 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="group text-center p-16 rounded-3xl bg-gradient-to-br from-gray-800/50 to-gray-700/30 hover:scale-105 transition-all duration-300 cursor-pointer max-w-2xl w-full"
          >
            <div className="inline-flex p-6 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 mb-6 group-hover:scale-110 transition-transform duration-300">
              <Users2 size={64} />
            </div>
            <div className="text-7xl md:text-8xl font-black mb-4 bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent">
              {memberCount.toLocaleString()}+
            </div>
            <div className="text-2xl md:text-3xl text-gray-400 font-medium group-hover:text-gray-300 transition-colors duration-300">
              Brothers
            </div>
          </motion.div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }}
          transition={{ delay: 0.9, duration: 0.8 }}
          className="text-center"
        >
          <div className="max-w-4xl mx-auto p-12 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-gray-700 hover:border-cyan-500/50 transition-all duration-500">
            <h3 className="text-3xl md:text-4xl font-black mb-6 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              READY TO ASCEND?
            </h3>
            
            <p className="text-xl text-gray-300 mb-8 leading-relaxed">
              The future belongs to those who master the essential skills today. 
              Join the Legion and become unstoppable.
            </p>

            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="group relative px-10 py-4 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full font-bold text-lg hover:scale-105 transition-transform duration-300 overflow-hidden"
              >
                <span className="relative z-10">JOIN THE LEGION</span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </motion.button>
              
              <motion.button 
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 border-2 border-cyan-400 text-cyan-400 rounded-full font-bold text-lg hover:bg-cyan-400 hover:text-black transition-all duration-300 hover:shadow-lg hover:shadow-cyan-400/25"
              >
                VIEW COURSES
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Community;