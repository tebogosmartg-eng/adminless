"use client";

import React from 'react';
import { LandingNav } from '@/components/landing/LandingNav';
import { LandingHero } from '@/components/landing/LandingHero';
import { ProblemSection } from '@/components/landing/ProblemSection';
import { FeaturesGrid } from '@/components/landing/FeaturesGrid';
import { AlignmentSection } from '@/components/landing/AlignmentSection';
import { ComplianceSection } from '@/components/landing/ComplianceSection';
import { WorkflowSection } from '@/components/landing/WorkflowSection';
import { AudienceSection } from '@/components/landing/AudienceSection';
import { DataPrivacySection } from '@/components/landing/DataPrivacySection';
import { FaqSection } from '@/components/landing/FaqSection';
import { TrustSection } from '@/components/landing/TrustSection';
import { FinalCtaSection } from '@/components/landing/FinalCtaSection';
import { LandingFooter } from '@/components/landing/LandingFooter';

const Landing = () => {
  return (
    <div className="min-h-screen bg-[#fcfcfd] dark:bg-[#0a0a0b] text-slate-900 dark:text-slate-100 flex flex-col">
      <LandingNav />
      <LandingHero />
      <ProblemSection />
      <FeaturesGrid />
      <AlignmentSection />
      <ComplianceSection />
      <WorkflowSection />
      <AudienceSection />
      <DataPrivacySection />
      <FaqSection />
      <TrustSection />
      <FinalCtaSection />
      <LandingFooter />
    </div>
  );
};

export default Landing;