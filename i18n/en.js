// מילון התרגום לאנגלית — נטען גם ב-index.html וגם ב-background.html.
// המפתחות הם מחרוזות המקור בעברית (כמצוין ב-API_REFERENCE § תוסף רב-לשוני);
// מחרוזת שאין לה מפתח כאן נשארת בעברית באופן טבעי.
// {n} / {q} / {v} / {msg} / {total} הם מצייני מקום שממולאים ב-t().
window.TRANSLATIONS = window.TRANSLATIONS || {};
window.TRANSLATIONS.en = {
  'לא ניתן להתחיל את הפעולה כרגע. נסו שוב': 'Cannot start the operation right now. Please try again.',
  // ── סרגל הכותרת והפילטרים ──
  'חנות תוספים': 'Plugin Store',
  'רענן רשימה': 'Refresh list',
  'חיפוש לפי שם, תיאור או תגית...': 'Search by name, description or tag…',
  'חיפוש תוספים': 'Search plugins',
  'כל הסטטוסים': 'All statuses',
  'יציב': 'Stable',
  'בטא': 'Beta',
  'ניסיוני': 'Experimental',
  'הסתרת תוספים שכבר מותקנים אצלך (למעט כאלה עם עדכון זמין)':
    'Hide plugins you already have installed (except those with an available update)',
  'הסתר מותקנים': 'Hide installed',
  'עדכן אותי בפתיחה': 'Notify me on startup',
  'הודעה בעליית אוצריא על עדכונים לתוספים ועל תוספים חדשים בחנות. כשמכובה — לא תוצג הודעה והתוסף לא ייטען בעלייה':
    'A notice when Otzaria starts about plugin updates and new plugins in the store. When off, no notice is shown and the plugin is not loaded at startup',
  'מיון': 'Sort',
  'מומלצים': 'Recommended',
  'החדשים ביותר': 'Newest',
  'עודכנו לאחרונה': 'Recently updated',

  // ── מצבים ומונים ──
  'טוען תוספים...': 'Loading plugins…',
  'לא נמצאו תוספים': 'No plugins found',
  'נסו לשנות את החיפוש או את הסינון.': 'Try changing the search or the filters.',
  'שגיאת רשת': 'Network error',
  'שגיאה בטעינת התוספים: {msg}': 'Failed to load plugins: {msg}',
  'אין חיבור לאינטרנט': 'No internet connection',
  'אם המחשב הזה לא אמור להיות מחובר לאינטרנט, אפשר להסיר את התוסף, או לעבור למצב "מנותק" בהגדרות התוכנה (בהגדרות של אוצריא עצמה, לא של התוסף).':
    'If this computer isn’t supposed to be connected to the internet, you can remove this plugin, or switch to “Offline” mode in the app’s settings (Otzaria’s own settings, not the plugin’s).',
  'נסו שוב': 'Try again',
  'אין חיבור לאינטרנט — הקטגוריה תיטען כשהמחשב יתחבר': 'No internet connection — the category will load once this computer is connected',
  '{n} תוספים': '{n} plugins',
  '{n} מתוך {total}': '{n} of {total}',

  // ── ניווט ותצוגות ──
  'קטגוריות': 'Categories',
  'בית': 'Home',
  'כל התוספים': 'All plugins',
  'תוספים נבחרים': 'Featured',
  'לכל הקטגוריה ({n}) ←': 'See all ({n}) →',
  'לא מצאתם את מה שחיפשתם? ': 'Didn’t find what you were looking for? ',
  'עיינו בכל התוספים ({n}) ←': 'Browse all plugins ({n}) →',
  'קטגוריה': 'Category',
  'שגיאה בטעינת הקטגוריה — נסו לרענן': 'Failed to load the category — try refreshing',
  'נמצאו {n} תוצאות עבור „{q}"': 'Found {n} results for “{q}”',
  'לא נמצאו התאמות מדויקות — מוצגות תוצאות קרובות': 'No exact matches — showing close results',
  'כל התגיות': 'All tags',
  'הצג עוד': 'Show more',
  'הצג פחות': 'Show less',

  // ── כרטיס ותגיות ──
  'גרסה {v}': 'Version {v}',
  'כמות הורדות': 'Download count',
  // סוגריים סביב מספר — מדרגים בשורת המטא, תוספים בשבב קטגוריה
  '({n})': '({n})',
  'דירוג ממוצע מתוך {n} מדרגים': 'Average rating from {n} ratings',

  // ── דף פרטים ──
  'חזרה לחנות': 'Back to store',
  'דירוג': 'Rating',
  'תיאור': 'Description',
  'מידע כללי': 'General info',
  'גרסה': 'Version',
  'סטטוס': 'Status',
  'הורדות': 'Downloads',
  'גודל': 'Size',
  'מפתח': 'Developer',
  'עודכן': 'Updated',
  'תאימות': 'Compatibility',
  'חיבור אינטרנט': 'Internet connection',
  'נדרש': 'Required',
  'לא נדרש': 'Not required',
  'שים לב': 'Note',
  'מוצגת הגרסה התואמת לגרסת אוצריא שלך. קיימת גרסה חדשה יותר ({v}) הדורשת גרסת אוצריא מתקדמת יותר.':
    'Showing the version compatible with your Otzaria build. A newer version ({v}) exists but requires a newer Otzaria.',
  'תגיות': 'Tags',
  // ── דירוגים (תצוגה בלבד; הדירוג עצמו נעשה באתר) ──
  'דירוג המשתמשים': 'User ratings',
  '{n} מדרגים': '{n} ratings',
  '{n} דירוגים מאומתים': '{n} verified ratings',
  'מדרגים שהתקנת התוסף אצלם נרשמה בפועל': 'raters whose installation was actually recorded',
  'הדירוג נאסף בדף התוסף באתר החנות': 'Ratings are collected on the plugin page at the store website',
  'התוסף עדיין לא דורג': 'This plugin has no ratings yet',
  'צילומי מסך': 'Screenshots',
  'צילום מסך': 'Screenshot',

  // ── התקנה ועדכון ──
  'מותקן ✓': 'Installed ✓',
  'מותקן ✓ · פתיחה': 'Installed ✓ · Open',
  'פתיחת התוסף': 'Open the plugin',
  'לא ניתן לפתוח את התוסף': 'Could not open the plugin',
  'עדכון': 'Update',
  'התקנה': 'Install',
  'מתקין...': 'Installing…',
  'מעדכן...': 'Updating…',
  'הותקן בהצלחה!': 'Installed successfully!',
  'עודכן בהצלחה!': 'Updated successfully!',
  'הותקן בהצלחה! לחצו לפתיחה': 'Installed successfully! Click to open',
  'עודכן בהצלחה! לחצו לפתיחה': 'Updated successfully! Click to open',
  'ההתקנה נכשלה - לחץ שוב לנסיון נוסף': 'Installation failed — click again to retry',
  'העדכון נכשל - לחץ שוב לנסיון נוסף': 'Update failed — click again to retry',
  'שגיאה': 'Error',
  'נשלח ✓': 'Sent ✓',

  // ── חלונית העדכונים ──
  'עדכונים זמינים ({n})': 'Updates available ({n})',
  '{from} ← {to}': '{from} → {to}',
  'עדכן': 'Update',
  'עדכן הכל': 'Update all',
  'הושלם ✓': 'Done ✓',
  'נסה שוב את מה שנכשל': 'Retry the ones that failed',

  // ── הודעת תוסף חדש ──
  'תוסף חדש בחנות!': 'A new plugin is in the store!',
  '{n} תוספים חדשים בחנות!': '{n} new plugins are in the store!',
  'צפה': 'View',
  'סגור': 'Close',

  // ── הודעות מופע הרקע ──
  'יש עדכונים זמינים לתוספים שברשותך וגם תוספים חדשים בחנות. לחצו כאן לפתיחת חנות התוספים.':
    'Updates are available for your plugins, and there are new plugins in the store. Click here to open the Plugin Store.',
  'יש עדכונים זמינים לתוספים שברשותך. לחצו כאן לפתיחת חנות התוספים.':
    'Updates are available for your plugins. Click here to open the Plugin Store.',
  'יש תוסף חדש בחנות התוספים. לחצו כאן לפתיחה.':
    'A new plugin is available in the Plugin Store. Click here to open it.',
  'יש {n} תוספים חדשים בחנות התוספים. לחצו כאן לפתיחה.':
    '{n} new plugins are available in the Plugin Store. Click here to open it.',

  // ── מצב אופליין: תיקיית "עדכוני אוצריא" ──
  'אפשר להתקין ולעדכן תוספים גם בלי אינטרנט, מתיקייה שהורדה במחשב אחר בתוכנת "עדכוני אוצריא" (למשל בכונן נייד).':
    'You can also install and update plugins without internet, from a folder downloaded on another computer with "Otzaria Offline Update" (for example on a USB drive).',
  'בחירת תיקיית עדכונים אופליין': 'Choose an offline update folder',
  'בחירת תיקיית העדכונים האופליין': 'Choose the offline update folder',
  'אתר החנות אינו זמין. מוצגים התוספים מתיקיית העדכונים {name}, שהורדו ב-{date}.':
    'The store website is unavailable. Showing plugins from the update folder {name}, downloaded on {date}.',
  'אתר החנות אינו זמין. מוצגים התוספים מתיקיית העדכונים {name}.':
    'The store website is unavailable. Showing plugins from the update folder {name}.',
  'החלפת תיקייה': 'Change folder',
  'ניתוק התיקייה': 'Disconnect folder',
  'תיקיית העדכונים {name} לא נמצאה. חברו את הכונן ונסו שוב, או בחרו תיקייה אחרת.':
    'The update folder {name} was not found. Connect the drive and try again, or choose another folder.',
  'בתיקייה {name} לא נמצאו תוספים מ"עדכוני אוצריא". בחרו את תיקיית OtzariaData או תיקייה בתוכה.':
    'No plugins from "Otzaria Offline Update" were found in the folder {name}. Choose the OtzariaData folder or a folder inside it.',
  'לחנות אין הרשאה לקרוא קבצים מהמחשב. אפשרו אותה בהגדרות התוסף ונסו שוב.':
    'The store has no permission to read files on this computer. Allow it in the plugin settings and try again.',
  'גרסת אוצריא שלך אינה תומכת בכך. עדכנו את אוצריא.': 'Your Otzaria version does not support this. Please update Otzaria.',
  'לא ניתן לבחור תיקייה. בדקו את הרשאות התוסף.': 'Cannot choose a folder. Check the plugin permissions.',
  'נדרשת גרסת אוצריא חדשה יותר להתקנה מהתיקייה': 'Installing from the folder requires a newer Otzaria version',
  'קובץ התוסף לא נמצא בתיקייה': 'The plugin file was not found in the folder',
  'ההתקנה בוטלה': 'Installation cancelled',
};
