import test from "node:test";import assert from "node:assert/strict";import {respond,MENU} from "../src/concierge";import {validSignature} from "../src/whatsapp";import {createHmac} from "node:crypto";
test("menu and options",()=>{assert.match(MENU,/Explore Artworks/);for(const [n,s] of [["1","artwork"],["2","artist"],["3","viewing"],["4","events"],["5","human"]])assert.equal(respond(n).state,s);});
test("viewing is pending",()=>{const r=respond("Friday 5pm","viewing");assert.equal(r.request,"private_viewing");assert.match(r.reply,/not a confirmed booking/);});
test("handoff reset",()=>{assert.equal(respond("MENU","human").state,"menu");});
test("signature validation",()=>{const s="test-secret",raw='{"entry":[]}';const sig="sha256="+createHmac("sha256",s).update(raw).digest("hex");assert.equal(validSignature(raw,sig,s),true);assert.equal(validSignature(raw+"x",sig,s),false);});
