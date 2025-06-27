export interface ApplicationQuestion {
  question: string;
  category: 'experience' | 'skills' | 'behavioral' | 'company' | 'other';
  keywords?: string[];
}

export const commonApplicationQuestions: ApplicationQuestion[] = [
  // Experience Questions
  {
    question: 'Years of experience in this field?',
    category: 'experience',
    keywords: ['years', 'experience', 'field']
  },
  {
    question: 'Do you have experience with the technologies mentioned in the job description?',
    category: 'experience',
    keywords: ['experience', 'technologies', 'tech stack']
  },
  {
    question: 'Describe a relevant project you have worked on.',
    category: 'experience',
    keywords: ['project', 'worked on', 'relevant']
  },
  {
    question: 'Have you worked in a similar industry before?',
    category: 'experience',
    keywords: ['industry', 'similar', 'worked']
  },

  // Skills Questions
  {
    question: 'What are your strongest technical skills relevant to this position?',
    category: 'skills',
    keywords: ['technical', 'skills', 'strongest']
  },
  {
    question: 'Rate your proficiency in the primary technology required for this role.',
    category: 'skills',
    keywords: ['proficiency', 'rate', 'technology']
  },
  {
    question: 'Do you have any relevant certifications?',
    category: 'skills',
    keywords: ['certifications', 'relevant', 'certified']
  },
  {
    question: 'What programming languages are you most comfortable with?',
    category: 'skills',
    keywords: ['programming', 'languages', 'comfortable']
  },

  // Behavioral Questions
  {
    question: 'Why are you interested in this position?',
    category: 'behavioral',
    keywords: ['why', 'interested', 'position']
  },
  {
    question: 'Describe a time when you overcame a technical challenge.',
    category: 'behavioral',
    keywords: ['challenge', 'overcame', 'technical']
  },
  {
    question: 'How do you handle working under pressure?',
    category: 'behavioral',
    keywords: ['pressure', 'handle', 'working']
  },
  {
    question: 'What motivates you in your work?',
    category: 'behavioral',
    keywords: ['motivates', 'work', 'motivation']
  },

  // Company Questions
  {
    question: 'Why do you want to work for our company?',
    category: 'company',
    keywords: ['why', 'company', 'work for']
  },
  {
    question: 'What do you know about our company?',
    category: 'company',
    keywords: ['know', 'company', 'about']
  },
  {
    question: 'How do you think you can contribute to our team?',
    category: 'company',
    keywords: ['contribute', 'team', 'how']
  },

  // Other Common Questions
  {
    question: 'Are you legally authorized to work in this country?',
    category: 'other',
    keywords: ['authorized', 'work', 'legally']
  },
  {
    question: 'What is your expected salary range?',
    category: 'other',
    keywords: ['salary', 'expected', 'range']
  },
  {
    question: 'When can you start?',
    category: 'other',
    keywords: ['start', 'when', 'available']
  },
  {
    question: 'Are you willing to relocate?',
    category: 'other',
    keywords: ['relocate', 'willing', 'location']
  },
  {
    question: 'Do you require sponsorship?',
    category: 'other',
    keywords: ['sponsorship', 'require', 'visa']
  }
];

export function detectQuestionCategory(question: string): ApplicationQuestion['category'] {
  const lowerQuestion = question.toLowerCase();
  
  // Check for experience-related keywords
  if (lowerQuestion.includes('experience') || 
      lowerQuestion.includes('worked') || 
      lowerQuestion.includes('previous') ||
      lowerQuestion.includes('project')) {
    return 'experience';
  }
  
  // Check for skills-related keywords
  if (lowerQuestion.includes('skill') || 
      lowerQuestion.includes('proficiency') || 
      lowerQuestion.includes('certification') ||
      lowerQuestion.includes('technology') ||
      lowerQuestion.includes('programming')) {
    return 'skills';
  }
  
  // Check for behavioral keywords
  if (lowerQuestion.includes('why') || 
      lowerQuestion.includes('describe') || 
      lowerQuestion.includes('tell me') ||
      lowerQuestion.includes('situation') ||
      lowerQuestion.includes('challenge')) {
    return 'behavioral';
  }
  
  // Check for company-specific keywords
  if (lowerQuestion.includes('our company') || 
      lowerQuestion.includes('this company') || 
      lowerQuestion.includes('our team')) {
    return 'company';
  }
  
  return 'other';
}

export function findSimilarQuestions(inputQuestion: string): ApplicationQuestion[] {
  const lowerInput = inputQuestion.toLowerCase();
  const words = lowerInput.split(/\s+/);
  
  return commonApplicationQuestions.filter(q => {
    const lowerQuestion = q.question.toLowerCase();
    
    // Check if any keywords match
    if (q.keywords) {
      const keywordMatch = q.keywords.some(keyword => 
        lowerInput.includes(keyword.toLowerCase())
      );
      if (keywordMatch) return true;
    }
    
    // Check if significant words from input appear in the question
    const significantWords = words.filter(w => w.length > 3);
    const wordMatches = significantWords.filter(word => 
      lowerQuestion.includes(word)
    ).length;
    
    return wordMatches >= 2;
  });
}