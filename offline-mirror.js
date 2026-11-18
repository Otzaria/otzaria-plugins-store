'use strict';

// קריאת המראה האופליינית של "עדכוני אוצריא" (OtzariaData/mirror/plugins/catalog.json)
// והמרתה לצורת /api/plugins שהחנות כבר מציגה. פונקציות טהורות בלבד: הגישה לדיסק
// והתקנה נעשות ב-index.html דרך ה-SDK.
window.StoreOfflineMirror = (() => {
  const SCHEME = 'mirror:';
  // היכן catalog.json יכול לשבת ביחס לתיקייה שהמשתמש בחר: התיקייה עצמה, מראת
  // הלאנצ'ר בכל רמה, או ייצוא החנות כתוכנה עצמאית (<יעד>/Data).
  const CATALOG_DIRS = ['', 'plugins', 'mirror/plugins', 'OtzariaData/mirror/plugins', 'Data'];

  const str = v => (typeof v === 'string' ? v : '');
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
  const strList = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string') : []);

  function join(...parts) {
    return parts.map(p => str(p).replace(/\\/g, '/').replace(/^\/+|\/+$/g, '')).filter(Boolean).join('/');
  }

  // נתיב יחסי בתוך התיקייה בלבד. אוצריא בודקת זאת שוב; כאן זה רק כדי שקטלוג
  // פגום לא ייצר בקשות שנכשלות.
  function isSafeRelative(path) {
    if (typeof path !== 'string' || !path.trim()) return false;
    const norm = path.replace(/\\/g, '/');
    if (norm.startsWith('/') || norm.includes(':')) return false;
    return norm.split('/').every(seg => seg !== '..' && seg !== '.');
  }

  function parseCatalog(text) {
    const data = JSON.parse(String(text).replace(/^\uFEFF/, ''));
    if (!data || typeof data !== 'object' || !Array.isArray(data.plugins)) {
      throw new Error('catalog.json is not an Otzaria plugins mirror');
    }
    return data;
  }

  function localFilesOf(raw) {
    const files = {};
    if (raw.localFiles && typeof raw.localFiles === 'object' && !Array.isArray(raw.localFiles)) {
      for (const [version, file] of Object.entries(raw.localFiles)) {
        if (file && isSafeRelative(file.path)) files[version] = file;
      }
    }
    // קטלוג ישן: קובץ יחיד ששייך לגרסה שלצדו.
    if (!Object.keys(files).length && raw.localFile && isSafeRelative(raw.localFile.path) && str(raw.version)) {
      files[raw.version] = raw.localFile;
    }
    return files;
  }

  // הבסיס והנתיב היחסי נשמרים בנפרד (| אינו חוקי בשם קובץ), כי בייצוא החנות
  // העצמאית הנתיבים יחסיים ל-Data/plugins ולא לתיקיית הקטלוג.
  const toUrl = (base, rel) => SCHEME + join(base) + '|' + join(rel);

  // תוסף מהקטלוג בצורת /api/plugins. רק בילדים שהקובץ שלהם במראה נשארים —
  // אופליין אי אפשר להתקין בילד אחר, ולכן selectBestVersion בוחר רק מביניהם.
  function toStorePlugin(raw, base) {
    if (!raw || typeof raw !== 'object' || !str(raw.id)) return null;
    const files = localFilesOf(raw);
    const entries = Array.isArray(raw.versions) && raw.versions.length ? raw.versions : [{
      version: raw.version, status: raw.status, compatibleWith: raw.compatibleWith,
      maxAppVersion: raw.maxAppVersion, requiresNetwork: raw.requiresNetwork, isLatest: true,
    }];
    const versions = entries
      .filter(v => v && str(v.version) && files[v.version] && /\.otzplugin$/i.test(files[v.version].path))
      .map(v => ({
        version: v.version,
        status: str(v.status) || str(raw.status),
        compatibleWith: str(v.compatibleWith),
        maxAppVersion: str(v.maxAppVersion) || null,
        requiresNetwork: v.requiresNetwork === true,
        pluginFileSize: num(files[v.version].size) || num(v.pluginFileSize),
        releasedAt: str(v.releasedAt),
        isLatest: v.isLatest === true,
        downloadUrl: toUrl(base, files[v.version].path),
      }));
    if (!versions.length) return null;
    const live = versions.find(v => v.version === raw.version) || versions[0];
    return {
      id: raw.id,
      // manifestId נקרא מתוך הארכיון, ולכן הוא שמתאים למזהה של התוסף המותקן.
      pluginUid: str(raw.manifestId) || str(raw.pluginUid) || undefined,
      name: str(raw.name),
      shortDescription: str(raw.shortDescription),
      description: str(raw.description),
      version: str(raw.version) || live.version,
      status: str(raw.status),
      author: str(raw.author),
      updatedAt: str(raw.updatedAt),
      originalDate: str(raw.originalDate),
      publishedAt: str(raw.publishedAt),
      fileUpdatedAt: str(raw.fileUpdatedAt),
      compatibleWith: str(raw.compatibleWith),
      maxAppVersion: str(raw.maxAppVersion) || null,
      requiresNetwork: raw.requiresNetwork === true,
      tags: strList(raw.tags),
      homepage: str(raw.homepage),
      downloadCount: num(raw.downloadCount),
      isPinned: raw.isFeatured === true || raw.isPinned === true,
      ratingAvg: num(raw.ratingAvg),
      ratingCount: num(raw.ratingCount),
      ratingVerifiedCount: num(raw.ratingVerifiedCount),
      ratingBreakdown: Array.isArray(raw.ratingBreakdown) ? raw.ratingBreakdown.map(num) : undefined,
      image: isSafeRelative(raw.image) ? toUrl(base, raw.image) : null,
      screenshots: strList(raw.screenshots).filter(isSafeRelative).map(s => toUrl(base, s)),
      categories: strList(raw.categories),
      pluginFileSize: live.pluginFileSize,
      downloadUrl: live.downloadUrl,
      versions,
    };
  }

  function toStorePlugins(catalog, base) {
    return catalog.plugins.map(raw => toStorePlugin(raw, base)).filter(Boolean);
  }

  // תשובת /api/plugins/store-home מתוך הקטלוג: נבחרים, קטגוריות וחברותן בסדר האתר.
  function toStoreHome(catalog, plugins) {
    const known = new Set(plugins.map(p => p.id));
    const categories = (Array.isArray(catalog.categories) ? catalog.categories : [])
      .filter(c => c && str(c.slug))
      .map(c => {
        const ids = strList(c.plugins).filter(id => known.has(id));
        const limit = Number.isInteger(c.homeLimit) && c.homeLimit > 0 ? c.homeLimit : 6;
        return {
          slug: c.slug,
          name: str(c.name) || c.slug,
          description: str(c.description),
          showOnHome: c.showOnHome === true,
          pluginCount: ids.length,
          // שורת דף הבית מוגבלת כמו באתר; דף הקטגוריה מקבל את members המלא.
          plugins: ids.slice(0, limit).map(id => ({ id })),
          members: ids.map(id => ({ id })),
        };
      })
      .filter(c => c.pluginCount > 0);
    const home = catalog.home && typeof catalog.home === 'object' ? catalog.home : {};
    return {
      settings: { homeTitle: str(home.title), homeSubtitle: str(home.subtitle) },
      featured: plugins.filter(p => p.isPinned).map(p => ({ id: p.id })),
      categories,
      totalPublicPlugins: plugins.length,
    };
  }

  const isMirrorUrl = url => typeof url === 'string' && url.startsWith(SCHEME);
  const pathOf = url => (isMirrorUrl(url) ? url.slice(SCHEME.length) : null);

  // הנתיבים בתיקייה לקובץ שב-pathOf: מראת הלאנצ'ר (<בסיס>/files/<id>/…), או ייצוא
  // החנות העצמאית (Data/catalog.json והקבצים ב-Data/plugins/<id>/…).
  function fileCandidates(path) {
    const at = path.indexOf('|');
    if (at < 0) return [path];
    const base = path.slice(0, at);
    const rel = path.slice(at + 1);
    return [join(base, rel), join(base, 'plugins', rel)];
  }

  return {
    CATALOG_DIRS, join, isSafeRelative, parseCatalog, toStorePlugins, toStoreHome,
    isMirrorUrl, pathOf, fileCandidates,
  };
})();
