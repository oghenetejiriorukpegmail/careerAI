/**
 * Utility functions for processing text into bullet points
 */

export function convertTextToBullets(text: string): string[] {
  if (!text || typeof text !== 'string') return [];
  
  let bullets: string[] = [];
  
  // First check if it looks like newline-separated bullets
  if (text.includes('\n')) {
    bullets = text.split(/\n+/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 5)
      .map((line: string) => {
        // Remove common bullet markers
        let cleaned = line.replace(/^[-•*→▪▸◦‣⁃]\s*/, '');
        // Remove numbering
        cleaned = cleaned.replace(/^\d+[\.)]\s*/, '');
        // Normalize quotes
        cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");
        
        // Capitalize first letter if needed
        if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
          cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
        }
        
        // Add period if missing
        if (!/[.!?]$/.test(cleaned)) {
          cleaned += '.';
        }
        
        return cleaned;
      });
    
    // If we got good bullets from newlines, return them
    if (bullets.length > 1) return bullets;
  }
  
  // Check for pipe-separated bullets (some AI models use this)
  if (text.includes(' | ') && text.split(' | ').length > 2) {
    bullets = text.split(' | ')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 5)
      .map((item: string) => formatBullet(item));
    
    if (bullets.length > 1) return bullets;
  }
  
  // Try to split by sentence endings (periods)
  if (text.includes('.')) {
    // More sophisticated regex to handle abbreviations
    const sentences = text.match(/[^.!?]+[.!?]+/g);
    
    if (sentences && sentences.length > 1) {
      bullets = sentences
        .map((sentence: string) => sentence.trim())
        .filter((sentence: string) => {
          // Filter out very short sentences that might be abbreviations
          const words = sentence.split(/\s+/);
          return words.length > 3 || sentence.length > 20;
        })
        .map((sentence: string) => formatBullet(sentence));
      
      if (bullets.length > 1) return bullets;
    }
  }
  
  // Try splitting by semicolons
  if (text.includes(';') && text.split(';').length > 2) {
    bullets = text.split(';')
      .map((item: string) => item.trim())
      .filter((item: string) => item.length > 5)
      .map((item: string) => formatBullet(item));
    
    if (bullets.length > 1) return bullets;
  }
  
  // Try splitting by commas (for shorter lists)
  if (text.includes(',') && text.split(',').length > 3 && text.length < 200) {
    const items = text.split(',').map(s => s.trim());
    // Check if items look like actions/responsibilities
    const actionWords = ['managed', 'developed', 'led', 'created', 'implemented', 'designed', 'built', 'organized'];
    const hasActions = items.some(item => 
      actionWords.some(action => item.toLowerCase().startsWith(action))
    );
    
    if (hasActions) {
      bullets = items
        .filter((item: string) => item.length > 5)
        .map((item: string) => formatBullet(item));
      
      if (bullets.length > 2) return bullets;
    }
  }
  
  // Try to split compound sentences with "and"
  if (text.toLowerCase().includes(' and ')) {
    // Count meaningful "and"s (not in phrases like "research and development")
    const parts = text.split(/\s+and\s+/i);
    const meaningfulParts = parts.filter(part => {
      const words = part.trim().split(/\s+/);
      return words.length > 3; // Each part should have more than 3 words
    });
    
    if (meaningfulParts.length >= 3) {
      bullets = meaningfulParts
        .map((item: string) => formatBullet(item));
      
      if (bullets.length > 2) return bullets;
    }
  }
  
  // Look for common patterns like "responsible for" or "duties include"
  const patterns = [
    /responsible for[:]\s*/i,
    /duties include[:]\s*/i,
    /responsibilities[:]\s*/i,
    /key achievements[:]\s*/i,
    /accomplishments[:]\s*/i
  ];
  
  for (const pattern of patterns) {
    if (pattern.test(text)) {
      const match = text.match(pattern);
      if (match) {
        const afterPattern = text.substring(match.index! + match[0].length);
        // Try to parse what comes after
        const parsedBullets = convertTextToBullets(afterPattern);
        if (parsedBullets.length > 1) return parsedBullets;
      }
    }
  }
  
  // If all else fails, check if it's already a well-formed single bullet
  if (text.length > 20) {
    return [formatBullet(text)];
  }
  
  return [text];
}

function formatBullet(text: string): string {
  let cleaned = text.trim();
  
  // Remove trailing "and" or "or"
  cleaned = cleaned.replace(/\s+(and|or)\s*$/i, '');
  
  // Capitalize first letter if needed
  if (cleaned.length > 0 && /^[a-z]/.test(cleaned)) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }
  
  // Ensure it starts with an action verb if it doesn't already
  const startsWithAction = /^(Managed|Led|Developed|Created|Designed|Built|Implemented|Organized|Coordinated|Executed|Established|Improved|Increased|Reduced|Streamlined|Optimized|Analyzed|Collaborated|Facilitated|Trained|Mentored|Presented|Achieved|Delivered|Maintained|Administered|Operated|Supported|Assisted|Prepared|Conducted|Performed|Oversaw|Directed|Supervised|Handled|Processed|Generated|Produced|Wrote|Edited|Reviewed)/i.test(cleaned);
  
  if (!startsWithAction && cleaned.length > 0) {
    // Try to infer an action verb based on content
    if (cleaned.toLowerCase().includes('team')) {
      cleaned = 'Managed ' + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    } else if (cleaned.toLowerCase().includes('system') || cleaned.toLowerCase().includes('software')) {
      cleaned = 'Developed ' + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    } else if (cleaned.toLowerCase().includes('process')) {
      cleaned = 'Improved ' + cleaned.charAt(0).toLowerCase() + cleaned.slice(1);
    }
  }
  
  // Add period if missing
  if (!/[.!?]$/.test(cleaned)) {
    cleaned += '.';
  }
  
  // Remove double periods
  cleaned = cleaned.replace(/\.+$/, '.');
  
  return cleaned;
}