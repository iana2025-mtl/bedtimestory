# Deployment Guide - Bedtime Story App

## Pre-Deployment Checklist

✅ **Code Quality**
- [x] All debug console.log statements removed
- [x] Error logging retained for production debugging
- [x] No linting errors
- [x] TypeScript compilation successful

✅ **Functionality Verified**
- [x] Image upload validation (10MB limit, JPEG/PNG/WebP only)
- [x] AI image generation (single unified images, exact child count, theme companions)
- [x] Story personalization (exact child names used)
- [x] Visual style filters applied correctly
- [x] Single-select behavior for themes/styles
- [x] Starry background extends full page height

✅ **Production Readiness**
- [x] All features tested
- [x] Error handling in place
- [x] User-friendly error messages
- [x] No regressions identified

## Required Environment Variables

The following environment variables **MUST** be configured in your deployment platform:

### Required
- `OPENAI_API_KEY` - Your OpenAI API key for story and image generation

### Optional
- `OPENAI_MODEL` - OpenAI model to use (default: `gpt-4o-mini`)
  - Options: `gpt-4o-mini`, `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`

## Deployment Steps

### Option 1: Vercel (Recommended for Next.js)

1. **Prepare your repository**
   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your Git repository
   - Configure environment variables:
     - `OPENAI_API_KEY` = (your OpenAI API key)
     - `OPENAI_MODEL` = `gpt-4o-mini` (optional, if you want to override default)
   - Click "Deploy"

3. **Verify deployment**
   - Test image upload with different formats
   - Test story generation with child names
   - Test AI image generation
   - Verify all error messages display correctly

### Option 2: Other Platforms

#### Netlify
- Connect your Git repository
- Build command: `npm run build`
- Publish directory: `.next`
- Add environment variables in site settings

#### Docker/Other
- Build: `npm run build`
- Start: `npm start`
- Ensure Node.js 18+ is available
- Set environment variables in your hosting environment

## Post-Deployment Verification

### Critical Tests
1. **Image Upload**
   - ✅ Upload JPEG image (< 10MB) - should work
   - ✅ Upload PNG image - should work
   - ✅ Upload WebP image - should work
   - ✅ Upload > 10MB file - should show error
   - ✅ Upload unsupported format (e.g., GIF) - should show error

2. **Story Generation**
   - ✅ Enter child names - verify exact names appear in story
   - ✅ Select theme - verify theme influences story
   - ✅ Select visual style - verify single style applied

3. **AI Image Generation**
   - ✅ Generate image with 1 child - verify 1 child appears
   - ✅ Generate image with 2 children - verify 2 children appear
   - ✅ Verify image is single unified (no split pages)
   - ✅ Verify theme companion appears (Princesses/Superheroes/Animals/Dragons)

4. **Uploaded Image Filters**
   - ✅ Upload photo and select visual style - verify filters applied
   - ✅ Switch between styles - verify different filters

5. **UI/UX**
   - ✅ Single-select works for themes/styles
   - ✅ Background stars extend full page
   - ✅ No console errors in browser
   - ✅ Responsive design works on mobile/tablet/desktop

## Monitoring

### Key Metrics to Monitor
- API response times (OpenAI calls)
- Error rates (check browser console, server logs)
- Image upload success rate
- User-reported issues

### Error Logging
- Production errors are logged via `console.error` and `console.warn`
- Monitor Vercel logs or your hosting platform's logging

## Troubleshooting

### Common Issues

**OpenAI API Errors**
- Verify `OPENAI_API_KEY` is set correctly
- Check API quota/billing status
- Verify API key has access to required models

**Image Upload Fails**
- Verify file size < 10MB
- Verify file format is JPEG/PNG/WebP
- Check browser console for errors

**Story Generation Issues**
- Verify OpenAI API key is configured
- Check network connectivity
- Review error messages in browser console

**Build Failures**
- Run `npm run build` locally to identify issues
- Check Node.js version (requires 18+)
- Verify all dependencies are installed

## Support

For issues or questions:
1. Check browser console for errors
2. Check server logs (Vercel dashboard)
3. Verify environment variables are set
4. Review OPENAI_SETUP.md for API configuration

