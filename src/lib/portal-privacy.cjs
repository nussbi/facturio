function redactPortalPath(pathname) {
  return pathname.replace(/^((?:\/app)?\/(?:api\/public\/)?portal)\/[^/]+/, '$1/[private-link]');
}

module.exports = { redactPortalPath };
