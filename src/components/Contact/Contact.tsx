import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, MessageSquare } from 'lucide-react';

const Contact: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const contactMethods = [
    {
      icon: <Mail size={24} />,
      title: "Email Us",
      description: "Get in touch directly",
      value: "support@legionofbrother.com",
      gradient: "from-cyan-500 to-blue-600",
    },
    {
      icon: <MessageSquare size={24} />,
      title: "Live Chat",
      description: "Instant support available",
      value: "Available 24/7",
      gradient: "from-purple-500 to-pink-600",
    },
  ];

  return (
    <section id="contact" className="py-24 px-4 bg-gradient-to-br from-black via-gray-900 to-black">
      <div className="max-w-6xl mx-auto">
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
            GET IN TOUCH
          </motion.h2>
          <motion.p 
            className="text-xl text-gray-300 max-w-3xl mx-auto"
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : { opacity: 0 }}
            transition={{ delay: 0.4, duration: 0.8 }}
          >
            Ready to join the Legion or have questions? Reach out to us and let's forge your path to greatness together.
          </motion.p>
        </motion.div>

        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-8"
          >
            <h3 className="text-3xl font-bold text-white mb-8 text-center">
              Connect with the <span className="text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text">Legion</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contactMethods.map((method, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 30 }}
                  animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                  transition={{ delay: 0.5 + (index * 0.1), duration: 0.6 }}
                  className="group flex items-start space-x-4 p-6 rounded-xl bg-gradient-to-r from-gray-800/50 to-gray-700/30 hover:from-cyan-500/10 hover:to-purple-600/10 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <div className={`flex-shrink-0 p-3 rounded-lg bg-gradient-to-br ${method.gradient} group-hover:scale-110 transition-transform duration-300`}>
                    {method.icon}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:bg-clip-text transition-all duration-300">
                      {method.title}
                    </h4>
                    <p className="text-gray-400 mb-1 group-hover:text-gray-300 transition-colors duration-300">
                      {method.description}
                    </p>
                    <p className="text-cyan-400 font-medium">
                      {method.value}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div
              className="p-6 bg-gradient-to-r from-cyan-500/10 to-purple-600/10 rounded-2xl border border-cyan-500/20"
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.8, duration: 0.6 }}
            >
              <h4 className="text-lg font-bold text-cyan-400 mb-3">RESPONSE TIME</h4>
              <p className="text-gray-300">
                • General inquiries: Within 24 hours<br />
                • Instructor applications: Within 48 hours<br />
                • Technical support: Within 12 hours<br />
                • Partnership opportunities: Within 72 hours
              </p>
            </motion.div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ delay: 1, duration: 0.8 }}
          className="text-center mt-16 pt-8 border-t border-gray-800"
        >
          <p className="text-gray-500">
            © 2025 The Legion of Brothers. All rights reserved. | Building the future, one warrior at a time.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default Contact;