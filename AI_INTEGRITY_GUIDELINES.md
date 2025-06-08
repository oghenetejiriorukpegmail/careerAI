# AI Integrity Guidelines for CareerAI

## Overview

This document outlines the **non-negotiable** integrity requirements for all AI-generated content in CareerAI. These guidelines ensure that users can trust the platform and confidently defend all claims made in their resumes and cover letters during interviews.

## Core Principle: Absolute Truthfulness

**The Golden Rule**: If it's not in the uploaded resume, it CANNOT be in the generated documents.

## Strict Requirements

### 1. Information Source
- **ONLY** use data from the user's uploaded resume
- **NEVER** supplement with external information
- **NEVER** make assumptions about unstated qualifications

### 2. Prohibited Actions
The AI must NEVER:
- ❌ Invent job titles, companies, or employment dates
- ❌ Add skills or technologies not mentioned
- ❌ Create achievements or metrics
- ❌ Fabricate certifications or education
- ❌ Embellish existing accomplishments
- ❌ Add tools, frameworks, or languages not listed
- ❌ Infer experience from job titles alone

### 3. Allowed Operations
The AI CAN:
- ✅ Reword content for clarity and impact
- ✅ Reorganize information strategically
- ✅ Use professional synonyms for existing terms
- ✅ Format with strong action verbs
- ✅ Highlight relevant existing experience
- ✅ Connect actual skills to job requirements
- ✅ Improve grammar and consistency

## Implementation Details

### Code Locations
- **Primary Implementation**: `/lib/ai/document-generator.ts`
- **Key Functions**: 
  - `generateAtsResume()`
  - `generateCoverLetter()`

### Prompt Engineering
Both system and user prompts include multiple layers of instructions:
1. Clear statement of truthfulness requirement
2. Explicit list of prohibited actions
3. Consequences of violations
4. Repeated emphasis throughout prompts

### Example Prompt Sections
```typescript
// System prompt excerpt
"ABSOLUTE REQUIREMENTS - NEVER VIOLATE THESE RULES:
1. USE ONLY information that exists in the candidate's uploaded resume
2. DO NOT invent, create, or embellish ANY..."

// User prompt excerpt
"STRICT RULES:
- Use ONLY the information provided in the candidate's resume above
- DO NOT add any new experiences, skills, or qualifications..."
```

## Handling Missing Qualifications

When a job requires skills/experience the candidate lacks:
1. **DO NOT** add the missing qualification
2. **INSTEAD**:
   - Emphasize related/transferable skills they DO have
   - Highlight relevant experience in adjacent areas
   - Show enthusiasm and ability to learn
   - Focus on accomplishments that demonstrate capability

### Example:
- Job requires: "5 years Python experience"
- Candidate has: "5 years Java experience"
- ❌ Wrong: Add Python to their skills
- ✅ Right: "5 years of object-oriented programming experience in Java, with strong foundation in software development principles applicable across languages"

## Why This Matters

### Legal Implications
- Resume fraud can be grounds for immediate termination
- False claims may have legal consequences
- Misrepresentation can damage professional reputation permanently

### Ethical Considerations
- Trust is fundamental to employer-employee relationships
- Integrity reflects on both the candidate and the platform
- Honesty builds long-term career success

### Practical Reasons
- Every claim must be defensible in interviews
- Technical interviews often probe deeply into stated experience
- References may be asked to verify claims
- Background checks will reveal discrepancies

## Testing Requirements

### Before Deployment
1. Test with resumes lacking common requirements
2. Verify AI doesn't add missing qualifications
3. Check that all content traces back to source
4. Ensure prompts can't be bypassed

### Ongoing Monitoring
- Regular audits of generated content
- User feedback on accuracy
- Comparison of source vs. generated documents
- Check for prompt injection attempts

## Developer Guidelines

### When Modifying AI Prompts
1. **Maintain** all truthfulness instructions
2. **Test** thoroughly for compliance
3. **Document** any changes and reasoning
4. **Review** with team before deployment

### Adding New Features
- Any new AI feature must comply with these guidelines
- Consider truthfulness in design phase
- Build in verification mechanisms
- Default to conservative interpretation

## Red Flags to Watch For

### In Generated Content
- Skills appearing that weren't in source
- Metrics that seem enhanced
- Technologies added to match job description
- Timeframes that don't match
- Responsibilities that seem expanded

### In Code Changes
- Removal of truthfulness instructions
- Weakening of strict requirements
- Addition of "enhancement" features
- Bypasses for "better matching"

## Enforcement

### Code Reviews
- All AI prompt changes require review
- Specifically check for integrity compliance
- Test with edge cases
- Document compliance verification

### User Reporting
- Clear mechanism for users to report issues
- Quick response to accuracy concerns
- Transparent communication about fixes

## Conclusion

These guidelines are not suggestions—they are requirements. The integrity of our users' professional lives depends on our commitment to absolute truthfulness. Every developer, every feature, and every line of code must support this principle.

**Remember**: A user's career can be destroyed by a single false claim. We must never be the cause of that destruction.

---

*Last Updated: [Current Date]*
*Version: 1.0*
*Status: Active and Enforced*