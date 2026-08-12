import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function offer(entityId = "itech-p4f") {
  const clid = "12345678";
  const vid = "sitewideFixture123";
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const destination = new URL(`https://market.yandex.ru${pathname}`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    id: `market-${entityId}`,
    market_source_url: `https://market.yandex.ru${pathname}`,
    page_path: `/kronshteyny/${entityId}/`,
    entity_kind: "mount",
    entity_id: entityId,
    compliance_mode: "non_ad_storefront",
    clid,
    vid,
    affiliate_href: destination.toString(),
    page_name: "POKUPKI_PRODUCT",
    title: `Кронштейн ${entityId}`,
    product_photo: "https://avatars.mds.yandex.net/get-mpic/1/example.jpeg/optimize",
    checked_at: new Date().toISOString(),
    eligibility: "publishable",
    publishable: true,
    creative: null,
  };
}

test("footer каждой React-страницы выводит безопасную прямую ссылку Маркета", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { SiteFooter } = await vite.ssrLoadModule("/src/components/SiteFooter.jsx");
    const html = renderToStaticMarkup(React.createElement(SiteFooter, {
      catalog: {
        affiliateOffers: [offer()],
        compatibilityEdges: [
          { mount_id: "itech-p4f", tv_id: "tv-1", fit_status: "verified-fit" },
          { mount_id: "itech-p4f", tv_id: "tv-2", fit_status: "verified-fit" },
        ],
      },
    }));

    assert.match(html, /data-affiliate-global-slot="true"/u);
    assert.match(html, /data-affiliate-global-link="true"/u);
    assert.match(html, /href="https:\/\/market\.yandex\.ru\/card\//u);
    assert.match(html, /rel="sponsored nofollow noopener noreferrer"/u);
    assert.match(html, /target="_blank"/u);
    assert.match(html, /проверьте VESA, диагональ и нагрузку/u);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});
