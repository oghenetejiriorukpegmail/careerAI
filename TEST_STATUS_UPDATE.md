# Manual Test for Status Update

## Steps to Test:

1. **Open your app** at http://localhost:4000 and make sure you're logged in

2. **Go to the Dashboard** and look at the Application Analytics section

3. **Note the current counts** for:
   - To Apply: ___
   - Applied: ___
   - Interviewing: ___
   - Offered: ___
   - Rejected: ___

4. **Find an application** in the "Recent Applications" section

5. **Change its status** using the dropdown (e.g., from "To Apply" to "Applied")

6. **Wait 2 seconds** or click the "Refresh Stats" button

7. **Check if the counts updated** correctly:
   - The old status count should decrease by 1
   - The new status count should increase by 1

## What to Look For:

✅ **Success indicators:**
- Toast notification shows "Status Updated"
- Analytics counts change within 2 seconds
- Manual refresh button updates counts immediately

❌ **If it's not working:**
- Check browser console for errors (F12 → Console tab)
- Try refreshing the entire page
- Check if the status dropdown actually changed

## Browser Console Commands (Optional):

You can also test directly in the browser console (F12):

```javascript
// Check current stats
fetch('/api/applications/stats?userId=' + (await (await fetch('/api/auth/user')).json()).user.id)
  .then(r => r.json())
  .then(d => console.log('Stats:', d.stats))

// Get debug info
fetch('/api/applications/debug')
  .then(r => r.json())
  .then(d => console.log('Debug:', d))
```