import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { extractTextFromPDF } from '@/services/aiQuizService';
import { parseAndAnalyzeResume, type ResumeAnalysis } from '@/services/aiInterviewService';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'sonner';

export function useResumeParser() {
  const { user } = useAuth();
  const [parsing, setParsing] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);

  const parseResume = async (file: File): Promise<ResumeAnalysis | null> => {
    if (!user) {
      toast.error('You must be logged in to analyze your resume');
      return null;
    }

    setParsing(true);
    try {
      toast.info('Extracting text from PDF resume...');
      const rawText = await extractTextFromPDF(file);

      toast.info('Analyzing resume details using AI...');
      const structuredData = await parseAndAnalyzeResume(rawText);

      const analysisRecord: ResumeAnalysis = {
        user_id: user.id,
        extracted_skills: structuredData.extracted_skills || [],
        projects: structuredData.projects || [],
        certifications: structuredData.certifications || [],
        education: structuredData.education || [],
        experience: structuredData.experience || [],
        raw_text: rawText
      };

      // Save to Supabase (upsert based on user_id)
      const { data, error } = await supabase
        .from('resume_analysis')
        .upsert(
          { 
            user_id: user.id,
            extracted_skills: analysisRecord.extracted_skills,
            projects: analysisRecord.projects,
            certifications: analysisRecord.certifications,
            education: analysisRecord.education,
            experience: analysisRecord.experience,
            raw_text: analysisRecord.raw_text,
            created_at: new Date().toISOString()
          },
          { onConflict: 'user_id' }
        )
        .select()
        .single();

      if (error) {
        console.error('Error saving resume analysis to Supabase:', error);
        // Fail silently and use the local record since database saving is secondary
      }

      setResumeAnalysis(analysisRecord);
      toast.success('Resume parsed and analyzed successfully!');
      return analysisRecord;
    } catch (error) {
      console.error('Failed to parse resume:', error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      toast.error(`Resume parsing failed: ${msg}`);
      return null;
    } finally {
      setParsing(false);
    }
  };

  const loadExistingAnalysis = useCallback(async (): Promise<ResumeAnalysis | null> => {
    if (!user) return null;
    try {
      const { data, error } = await supabase
        .from('resume_analysis')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading resume analysis:', error);
      }

      if (data) {
        setResumeAnalysis(data as ResumeAnalysis);
        return data as ResumeAnalysis;
      }
    } catch (error) {
      console.error('Failed to fetch existing analysis:', error);
    }
    return null;
  }, [user]);

  const clearAnalysis = async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('resume_analysis')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;
      setResumeAnalysis(null);
      toast.success('Saved resume profile cleared.');
    } catch (error) {
      console.error('Failed to clear resume analysis:', error);
      toast.error('Failed to clear resume.');
    }
  };

  return {
    parsing,
    resumeAnalysis,
    parseResume,
    loadExistingAnalysis,
    clearAnalysis
  };
}
