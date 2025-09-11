#!/usr/bin/env node

/**
 * Script to manually clear browser-side Supabase session data
 * Run this script and then execute the output in your browser console
 */

console.log(`
🧹 Browser Session Cleanup Script
================================

Copy and paste this code into your browser console (F12 > Console tab):

// Clear all localStorage data
localStorage.clear();

// Clear all sessionStorage data  
sessionStorage.clear();

// Clear specific Supabase keys (if they persist)
Object.keys(localStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    localStorage.removeItem(key);
  }
});

Object.keys(sessionStorage).forEach(key => {
  if (key.includes('supabase') || key.includes('sb-')) {
    sessionStorage.removeItem(key);
  }
});

// Clear cookies (partial - need manual clearing for httpOnly)
document.cookie.split(";").forEach(function(c) { 
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
});

console.log('✅ Browser session data cleared');

// Force page reload
window.location.reload();

================================

Alternative: Open an incognito/private browser window and go to localhost:3002
`);