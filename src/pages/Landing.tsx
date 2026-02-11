"use client";

import React from 'react';
import { motion, Variants } from 'framer-motion';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { AlignmentSection } from '@/components/landing/AlignmentSection';
import { ComplianceSection } from '@/components/landing/ComplianceSection';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { AudienceSection } from '@/components/landing/AudienceSection';
import { PricingSection } from '@/components/landing/PricingSection';
import { TestimonialsSection } from '@/components/landing/TestimonialsSection';
import { DataPrivacySection } from '@/components/landing/DataPrivacySection';
import { FaqSection } from '@/components/landing/FaqSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

const fadeInVariant: Variants = {
  hidden: { opacity: 0, y: 15 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.8, ease: "easeOut" }
  }
};

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-blue-100 selection:text-blue-900">
      <LandingNav />
      
      <LandingHero />

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <ProblemSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <FeaturesGrid />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <AlignmentSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <ComplianceSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <WorkflowSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <AudienceSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <PricingSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <TestimonialsSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <DataPrivacySection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <FaqSection />
      </motion.div>

      <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInVariant}>
        <TrustSection />
      </motion.div>

      <FinalCtaSection />
      
      <LandingFooter />
    </div>
  );
};

export default Landing;