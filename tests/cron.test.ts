import test from "node:test";
import assert from "node:assert/strict";
import {cronAuthorized} from "../src/cron";
test("scheduled maintenance requires exact server-side token",()=>{
 const token="phase-one-maintenance-token";
 assert.equal(cronAuthorized("Bearer "+token,token),true);
 assert.equal(cronAuthorized("Bearer wrong",token),false);
 assert.equal(cronAuthorized("Bearer "+token,undefined),false);
 assert.equal(cronAuthorized(null,token),false);
 assert.equal(cronAuthorized("Basic "+token,token),false);
});
