import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import { Mail, MessageSquare, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const Contact: React.FC = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }

    // Clear general error
    if (error) {
      setError(null);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.length > 5000) {
      errors.name = 'Name is too long (max 5000 characters)';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    } else if (formData.email.length > 5000) {
      errors.email = 'Email is too long (max 5000 characters)';
    }

    if (!formData.subject.trim()) {
      errors.subject = 'Subject is required';
    } else if (formData.subject.length > 5000) {
      errors.subject = 'Subject is too long (max 5000 characters)';
    }

    if (!formData.message.trim()) {
      errors.message = 'Message is required';
    } else if (formData.message.length > 5000) {
      errors.message = 'Message is too long (max 5000 characters)';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Clear previous errors
    setError(null);
    setValidationErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const { data, error: functionError } = await supabase.functions.invoke('contact-send', {
        body: {
          name: formData.name.trim(),
          email: formData.email.trim(),
          subject: formData.subject.trim(),
          message: formData.message.trim(),
        },
      });

      if (functionError) {
        throw functionError;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      // Success
      setIsSubmitted(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });

      // Reset success message after 5 seconds
      setTimeout(() => setIsSubmitted(false), 5000);
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const contactMethods = [
    {
      icon: <Mail size={24} />,
      title: "Email Us",
      description: "Get in touch directly",
      value: "legion@brothers.com",
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Contact Methods */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            className="space-y-8"
          >
            <h3 className="text-3xl font-bold text-white mb-8">
              Connect with the <span className="text-transparent bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text">Legion</span>
            </h3>

            <div className="space-y-6">
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

          {/* Contact Form */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={inView ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="relative"
          >
            <div className="p-8 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl border border-gray-700 hover:border-cyan-500/50 transition-all duration-500">
              <h3 className="text-2xl font-bold text-white mb-8 text-center">Send us a Message</h3>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start space-x-3"
                >
                  <AlertCircle size={20} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <p className="text-red-300 text-sm">{error}</p>
                </motion.div>
              )}

              {!isSubmitted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
                        Name *
                      </label>
                      <input
                        type="text"
                        id="name"
                        name="name"
                        required
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                          validationErrors.name ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="Your name"
                      />
                      {validationErrors.name && (
                        <p className="mt-1 text-sm text-red-400">{validationErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleInputChange}
                        disabled={isLoading}
                        className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                          validationErrors.email ? 'border-red-500' : 'border-gray-600'
                        }`}
                        placeholder="your@email.com"
                      />
                      {validationErrors.email && (
                        <p className="mt-1 text-sm text-red-400">{validationErrors.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                      Subject *
                    </label>
                    <select
                      id="subject"
                      name="subject"
                      required
                      value={formData.subject}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        validationErrors.subject ? 'border-red-500' : 'border-gray-600'
                      }`}
                    >
                      <option value="">Select a subject</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Instructor Application">Instructor Application</option>
                      <option value="Student Enrollment">Student Enrollment</option>
                      <option value="Partnership Opportunity">Partnership Opportunity</option>
                      <option value="Technical Support">Technical Support</option>
                    </select>
                    {validationErrors.subject && (
                      <p className="mt-1 text-sm text-red-400">{validationErrors.subject}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-300 mb-2">
                      Message * <span className="text-gray-500 text-xs">({formData.message.length}/5000)</span>
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      value={formData.message}
                      onChange={handleInputChange}
                      disabled={isLoading}
                      maxLength={5000}
                      className={`w-full px-4 py-3 bg-gray-800/50 border rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-white placeholder-gray-400 transition-all duration-300 resize-none disabled:opacity-50 disabled:cursor-not-allowed ${
                        validationErrors.message ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="Tell us how we can help you forge your path to greatness..."
                    />
                    {validationErrors.message && (
                      <p className="mt-1 text-sm text-red-400">{validationErrors.message}</p>
                    )}
                  </div>

                  <motion.button
                    type="submit"
                    disabled={isLoading}
                    whileHover={!isLoading ? { scale: 1.02 } : {}}
                    whileTap={!isLoading ? { scale: 0.98 } : {}}
                    className="group w-full py-4 px-6 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl font-bold text-lg text-white overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed relative"
                  >
                    <span className="relative z-10 flex items-center justify-center space-x-3">
                      {isLoading ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>SENDING...</span>
                        </>
                      ) : (
                        <>
                          <Send size={20} className="group-hover:translate-x-1 transition-transform duration-300" />
                          <span>SEND MESSAGE</span>
                        </>
                      )}
                    </span>
                    {!isLoading && (
                      <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    )}
                  </motion.button>
                </form>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.6, ease: "easeInOut" }}
                    className="inline-flex p-4 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 mb-6"
                  >
                    <CheckCircle size={48} className="text-white" />
                  </motion.div>
                  <h3 className="text-2xl font-bold text-white mb-4">Message Sent!</h3>
                  <p className="text-gray-300">
                    Thank you for reaching out to The Legion of Brothers. 
                    We'll get back to you within 24 hours.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Decorative elements */}
            <div className="absolute -top-4 -left-4 w-16 h-16 border-t-2 border-l-2 border-cyan-500/30" />
            <div className="absolute -top-4 -right-4 w-16 h-16 border-t-2 border-r-2 border-purple-500/30" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 border-b-2 border-l-2 border-purple-500/30" />
            <div className="absolute -bottom-4 -right-4 w-16 h-16 border-b-2 border-r-2 border-cyan-500/30" />
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