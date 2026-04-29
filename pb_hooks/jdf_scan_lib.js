/// <reference path="../pb_data/types.d.ts" />

// Shared JDF scan library, loaded via require() inside handler callbacks
// because each hook handler runs in an isolated JS VM.

function bytesToString(bytes) {
    var result = '';
    var chunk = [];
    var i = 0;
    while (i < bytes.length) {
        var c = bytes[i++];
        if (c < 128) {
            chunk.push(c);
        } else if ((c > 191) && (c < 224)) {
            var c2 = bytes[i++];
            chunk.push(((c & 31) << 6) | (c2 & 63));
        } else if (c > 239) {
            var c2 = bytes[i++];
            var c3 = bytes[i++];
            var c4 = bytes[i++];
            var u = (((c & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) - 0x10000;
            chunk.push(0xD800 + (u >> 10), 0xDC00 + (u & 1023));
        } else {
            var c2 = bytes[i++];
            var c3 = bytes[i++];
            chunk.push(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        }
        if (chunk.length >= 8192) {
            result += String.fromCharCode.apply(null, chunk);
            chunk = [];
        }
    }
    if (chunk.length > 0) {
        result += String.fromCharCode.apply(null, chunk);
    }
    return result;
}

function regexAll(text, pattern) {
    var re = new RegExp(pattern, 'g');
    var results = [];
    var m;
    while ((m = re.exec(text)) !== null) results.push(m);
    return results;
}


function parseDdMmYyyy(str) {
    // "23/04/2026 0:00:00" → "2026-04-23T00:00:00.000Z"
    if (!str) return '';
    var m = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!m) return '';
    var d = m[1].length === 1 ? '0' + m[1] : m[1];
    var mo = m[2].length === 1 ? '0' + m[2] : m[2];
    return m[3] + '-' + mo + '-' + d + 'T00:00:00.000Z';
}

function extractXmlTag(xml, tag) {
    var m = xml.match(new RegExp('<' + tag + '>([\\s\\S]*?)<\\/' + tag + '>'));
    return m ? decodeXmlEntities(m[1].trim()) : '';
}

function decodeXmlEntities(str) {
    if (!str) return str;
    return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"');
}

// Parse a JDF paper_ref like "HV-100-960/UPM Finesse Gloss" into its components.
// Returns null if the string doesn't match the expected format.
function parsePaperRef(ref) {
    if (!ref) return null;
    var parts = ref.split('/');
    if (parts.length < 2) return null;
    var prefix = parts[0];
    var productName = parts.slice(1).join('/').trim();
    var segs = prefix.split('-');
    if (segs.length < 3 || !productName) return null;
    var gsm = parseInt(segs[1], 10);
    var breedte = parseInt(segs[2], 10);
    if (isNaN(gsm)) return null;
    var firstWord = productName.split(/\s+/)[0] || '';
    return {
        klasse:    segs[0],
        gsm:       gsm,
        breedte:   isNaN(breedte) ? null : breedte,
        naam:      productName,
        fabrikant: firstWord
    };
}

var PRESS_MAP = { 'c80': 'C80', 'c818': 'C818', 'litho': 'Lithoman', 'lithoman': 'Lithoman' };

function normalizePress(name) {
    if (!name) return 'EXTERN (De Maertelare)';
    var lower = name.trim().toLowerCase();
    return PRESS_MAP[lower] || 'EXTERN (De Maertelare)';
}

function parseXmlOrder(xml) {
    var result = {};

    result.order_nummer = extractXmlTag(xml, 'order_no');
    result.order_naam   = extractXmlTag(xml, 'job_description');
    result.klant        = extractXmlTag(xml, 'cust_name');
    result.csr          = extractXmlTag(xml, 'estimator_name');
    result.paginas      = parseInt(extractXmlTag(xml, 'total_pagination'), 10) || null;
    result.finishing_style = extractXmlTag(xml, 'finishing_style');

    var rawWidth = extractXmlTag(xml, 'width');
    var rawDepth = extractXmlTag(xml, 'depth');
    result.bruto_breedte = rawWidth || '';
    result.bruto_hoogte  = rawDepth || '';

    var rawQty = extractXmlTag(xml, 'order_qty');
    result.totaal_oplage = rawQty ? parseInt(rawQty, 10) : null;

    var rawDeadline = extractXmlTag(xml, 'order_del_commence_date');
    result.deadline = parseDdMmYyyy(rawDeadline);
    var rawPrintDate = extractXmlTag(xml, 'target_print_date');
    result.target_print_date = parseDdMmYyyy(rawPrintDate);

    // Papier: prefer <job_paper_ref> (canonical, format "KLASSE-GSM-BREEDTE/Productnaam"),
    // fall back to brand + gsm from <paper_requirement>
    var jobPaperRef = extractXmlTag(xml, 'job_paper_ref');
    if (jobPaperRef) {
        result.papier = jobPaperRef;
    } else {
        var paperBlock = xml.match(/<paper_requirement>([\s\S]*?)<\/paper_requirement>/);
        if (paperBlock) {
            var brand = extractXmlTag(paperBlock[1], 'paper_brand');
            var gsm   = extractXmlTag(paperBlock[1], 'paper_gsm');
            result.papier = brand && gsm ? brand + ' ' + gsm + 'g' : (brand || gsm || '');
        } else {
            result.papier = '';
        }
    }

    // Kleuren: count inks_front / inks_back from first component's component_colour blocks
    var compBlock = xml.match(/<component>([\s\S]*?)<\/component>/);
    var frontCount = 0, backCount = 0;
    if (compBlock) {
        var colMatches = regexAll(compBlock[1],
            '<component_colour>[\\s\\S]*?<inks_front>(\\d+)<\\/inks_front>[\\s\\S]*?<inks_back>(\\d+)<\\/inks_back>[\\s\\S]*?<\\/component_colour>');
        for (var i = 0; i < colMatches.length; i++) {
            if (parseInt(colMatches[i][1], 10) > 0) frontCount++;
            if (parseInt(colMatches[i][2], 10) > 0) backCount++;
        }
    }
    result.kleuren_voor   = frontCount > 0 ? String(frontCount) : '';
    result.kleuren_achter = backCount  > 0 ? String(backCount)  : '';

    // plate_change per version_id (from route <version> blocks)
    var plateChanges = {};
    var plateMatches = regexAll(xml,
        '<version>[\\s\\S]*?<version_id>([^<]*)<\\/version_id>[\\s\\S]*?<plate_change>([^<]*)<\\/plate_change>[\\s\\S]*?<\\/version>');
    for (var p = 0; p < plateMatches.length; p++) {
        var pcId = plateMatches[p][1].trim();
        if (!plateChanges[pcId]) plateChanges[pcId] = plateMatches[p][2].trim();
    }

    // part_version_id → part_version_name lookup (canonical version name source)
    var partNameById = {};
    var partMatches = regexAll(xml,
        '<part_version_id>([^<]+)<\\/part_version_id>[\\s\\S]*?<part_version_name>([^<]*)<\\/part_version_name>');
    for (var pn = 0; pn < partMatches.length; pn++) {
        var pnId = partMatches[pn][1].trim();
        if (!partNameById[pnId]) partNameById[pnId] = decodeXmlEntities(partMatches[pn][2].trim());
    }

    // Versies: press_version blocks, excluding COMM
    var LANG_PREFIXES = ['NL', 'FR', 'DE', 'EN'];
    var prefixRegex = new RegExp('^(' + LANG_PREFIXES.join('|') + ')\\s*[-–]\\s*', 'i');
    var versieMatches = regexAll(xml,
        '<press_version>[\\s\\S]*?<version_id>([^<]*)<\\/version_id>[\\s\\S]*?<version_description>([^<]*)<\\/version_description>[\\s\\S]*?<version_nett_qty>(\\d+)<\\/version_nett_qty>');
    result.versies = [];
    var commVersie = null;
    for (var j = 0; j < versieMatches.length; j++) {
        var vId   = versieMatches[j][1].trim();
        var vDesc = partNameById[vId] || versieMatches[j][2].trim();
        var vQty  = parseInt(versieMatches[j][3], 10);
        if (vId === 'COMM') {
            if (!commVersie) commVersie = { version: vDesc, langPrefix: '', versionLabel: vDesc, partVersion: vId, oplage: vQty, wissel: 'Opstart' };
            continue;
        }
        var langMatch  = vDesc.match(prefixRegex);
        var langPrefix = langMatch ? langMatch[1].toUpperCase() : '';
        var versionLabel = langMatch ? vDesc.slice(langMatch[0].length).trim() : vDesc;
        var isFirst = result.versies.length === 0;
        result.versies.push({
            version:      vDesc,
            langPrefix:   langPrefix,
            versionLabel: versionLabel,
            partVersion:  vId,
            oplage:       vQty,
            wissel:       isFirst ? 'Opstart' : (plateChanges[vId] || '')
        });
    }
    // Single-version orders that only have COMM: keep COMM as the sole version
    if (result.versies.length === 0 && commVersie) result.versies.push(commVersie);
    result.aantal_versies = result.versies.length;

    // Vouwwijze + ex_omw: first catalog_name
    var catalogMatch = xml.match(/<catalog_name>([^<]*)<\/catalog_name>/);
    result.vouwwijze = catalogMatch ? catalogMatch[1].trim() : '';
    var exOmwMatch = result.vouwwijze ? result.vouwwijze.match(/(\d+)x(?:_|$)/) : null;
    result.ex_omw = exOmwMatch ? exOmwMatch[1] : '1';

    // Pers: afgeleid uit het laatste segment van catalog_name (bv. _Litho, _c80, _c818)
    var pressFromCatalog = result.vouwwijze ? result.vouwwijze.match(/_([^_]+)$/) : null;
    var pressRaw = pressFromCatalog ? pressFromCatalog[1].toLowerCase() : '';
    result.pers_device_id = PRESS_MAP[pressRaw] || '';

    // Katernen: parse press_mow blocks
    var mowMatches = regexAll(xml, '<press_mow>([\\s\\S]*?)<\\/press_mow>');
    result.katernen = [];
    for (var k = 0; k < mowMatches.length; k++) {
        var mow = mowMatches[k][1];
        var mowPress    = extractXmlTag(mow, 'mow_press_name');
        var mowPag      = parseInt(extractXmlTag(mow, 'mow_pagination'), 10) || 0;
        var mowNoOfColours = extractXmlTag(mow, 'mow_no_of_colours');
        var mowWissel   = mowNoOfColours; // overridden below with plate_change when available
        var mowOutwork  = extractXmlTag(mow, 'mow_outwork').toLowerCase() === 'true';
        var mowFold     = extractXmlTag(mow, 'fold_catalog');
        var mowSection  = extractXmlTag(mow, 'mow_section_id');
        var pressName   = mowOutwork ? 'EXTERN (De Maertelare)' : normalizePress(mowPress);

        // sig_id (Katern) + sequence_id (Volgorde) + task_nett_qty from mow_press_delivery
        var deliveryBlock = mow.match(/<mow_press_delivery>([\s\S]*?)<\/mow_press_delivery>/);
        var mowSigId = '';
        var mowVolgorde = null;
        var mowOplage = null;
        if (deliveryBlock) {
            mowSigId = extractXmlTag(deliveryBlock[1], 'sig_id');
            var seq = parseInt(extractXmlTag(deliveryBlock[1], 'sequence_id'), 10);
            if (!isNaN(seq)) mowVolgorde = seq;
            var nettQty = parseInt(extractXmlTag(deliveryBlock[1], 'task_nett_qty'), 10);
            if (nettQty > 0) mowOplage = nettQty;
        }
        // Fallback to mow_run_sheets (bruto vellen) when task_nett_qty is absent
        if (!mowOplage) mowOplage = parseInt(extractXmlTag(mow, 'mow_run_sheets'), 10) || null;

        // ex_omw from fold_catalog (e.g. W_32p_A4_P_1x_Litho → "1")
        var mowExOmwMatch = mowFold ? mowFold.match(/(\d+)x(?:_|$)/) : null;
        var mowExOmw = mowExOmwMatch ? mowExOmwMatch[1] : result.ex_omw;

        // paper from mow_paper sub-block — prefer <paper_ref> (canonical),
        // fall back to brand + gsm
        var mowPaperBlock = mow.match(/<mow_paper>([\s\S]*?)<\/mow_paper>/);
        var mowPapier = '';
        var mowKilo = null;
        if (mowPaperBlock) {
            var mpRef = extractXmlTag(mowPaperBlock[1], 'paper_ref');
            if (mpRef) {
                mowPapier = mpRef;
            } else {
                var mpBrand = extractXmlTag(mowPaperBlock[1], 'paper_brand');
                var mpGsm   = extractXmlTag(mowPaperBlock[1], 'paper_gsm');
                mowPapier = mpBrand && mpGsm ? mpBrand + ' ' + mpGsm + 'g' : (mpBrand || mpGsm || '');
            }
            var mpKilo = parseInt(extractXmlTag(mowPaperBlock[1], 'paper_qty_kgs'), 10);
            if (mpKilo > 0) mowKilo = mpKilo;
        }

        // version names linked to this katern (task_version_id inside mow_press_delivery blocks,
        // resolved to part_version_name — falls back to the id if no name is known).
        // Also use first non-COMM task_version_id to look up plate_change as wissel.
        var taskVersionMatches = regexAll(mow, '<task_version_id>([^<]+)<\\/task_version_id>');
        var mowVersies = [];
        var firstTaskVersionId = '';
        for (var tv = 0; tv < taskVersionMatches.length; tv++) {
            var tvId = taskVersionMatches[tv][1].trim();
            if (!tvId) continue;
            if (!firstTaskVersionId && tvId !== 'COMM') firstTaskVersionId = tvId;
            var tvName = partNameById[tvId] || tvId;
            if (mowVersies.indexOf(tvName) === -1) mowVersies.push(tvName);
        }

        // Prefer plate_change from route version block over mow_no_of_colours for wissel
        if (firstTaskVersionId && plateChanges[firstTaskVersionId]) {
            mowWissel = plateChanges[firstTaskVersionId];
        }

        result.katernen.push({
            sectionId:  mowSection,
            signatureId: mowSigId,
            volgorde:   mowVolgorde,
            pagination: mowPag,
            wissel:     mowWissel,
            press:      pressName,
            oplage:     mowOplage,
            extern:     mowOutwork,
            vouwwijze:  mowFold,
            exOmw:      mowExOmw,
            papier:     mowPapier,
            kilo:       mowKilo,
            versies:    mowVersies
        });
    }

    // If volgorde values exceed katern count (e.g. sequence_id == sig_pagination), renumber 1-based
    var maxVolgorde = 0;
    for (var kv = 0; kv < result.katernen.length; kv++) {
        if (result.katernen[kv].volgorde > maxVolgorde) maxVolgorde = result.katernen[kv].volgorde;
    }
    if (result.katernen.length > 0 && maxVolgorde > result.katernen.length) {
        for (var kr = 0; kr < result.katernen.length; kr++) result.katernen[kr].volgorde = kr + 1;
    }

    // Use first non-extern katern's press for pers_device_id when available
    if (result.katernen.length > 0 && !result.pers_device_id) {
        for (var ki = 0; ki < result.katernen.length; ki++) {
            if (!result.katernen[ki].extern) {
                result.pers_device_id = result.katernen[ki].press;
                break;
            }
        }
    }

    return result;
}


function persistLastScan(result) {
    try {
        var scanSetting;
        try {
            scanSetting = $app.findFirstRecordByFilter("app_settings", 'key = "jdf_last_scan"');
        } catch (_) {
            var settingsCol = $app.findCollectionByNameOrId("app_settings");
            scanSetting = new Record(settingsCol);
            scanSetting.set("key", "jdf_last_scan");
        }
        scanSetting.set("value", {
            timestamp: new Date().toISOString(),
            files_found: result.files_found,
            new_records: result.new_records,
            updated_records: result.updated_records,
            stat_calls: result.stat_calls,
            read_files: result.read_files
        });
        $app.save(scanSetting);
    } catch (e) { /* non-critical */ }
}

function runJdfScan(options) {
    var force = options && options.force;
    var scanStart = Date.now();
    var result = { files_found: 0, candidates: 0, new_records: 0, updated_records: 0, skipped_files: 0, read_files: 0, stat_calls: 0, skipped: false };

    // Load configurable scan settings (interval + active hours window)
    var scanSettings = { interval_minutes: 30, start_hour: 7, end_hour: 18 };
    try {
        var settingsRec = $app.findFirstRecordByFilter("app_settings", 'key = "jdf_scan_settings"');
        if (settingsRec) {
            var svStr = String(settingsRec.get("value") || '');
            if (svStr.charAt(0) === '{') {
                try {
                    var sv = JSON.parse(svStr);
                    if (sv.interval_minutes) scanSettings.interval_minutes = parseInt(sv.interval_minutes, 10) || 30;
                    if (sv.start_hour !== undefined) scanSettings.start_hour = parseInt(sv.start_hour, 10);
                    if (sv.end_hour   !== undefined) scanSettings.end_hour   = parseInt(sv.end_hour,   10);
                } catch (_) {}
            }
        }
    } catch (_) {}

    if (!force) {
        var nowHour = new Date().getHours();
        if (nowHour < scanSettings.start_hour || nowHour >= scanSettings.end_hour) {
            console.log("[JDF Scan] Buiten actieve uren (" + nowHour + ":xx, venster " + scanSettings.start_hour + ":00–" + scanSettings.end_hour + ":00), overgeslagen.");
            result.skipped = true;
            return result;
        }
        // jdf_scan_ts: plain Unix-ms number written at scan START — reliable across JSON parsing quirks
        var lastTs = 0;
        try {
            var tsRec = $app.findFirstRecordByFilter("app_settings", 'key = "jdf_scan_ts"');
            if (tsRec) lastTs = parseFloat(String(tsRec.get("value"))) || 0;
        } catch (_) {}
        if (lastTs > 0) {
            var minsSinceLast = (Date.now() - lastTs) / 60000;
            if (minsSinceLast < scanSettings.interval_minutes) {
                console.log("[JDF Scan] Interval niet verstreken (" + Math.round(minsSinceLast) + "/" + scanSettings.interval_minutes + " min), overgeslagen.");
                result.skipped = true;
                return result;
            }
        }
    }

    // Claim the slot immediately so overlapping ticks see a fresh timestamp
    try {
        var tsClaim;
        try { tsClaim = $app.findFirstRecordByFilter("app_settings", 'key = "jdf_scan_ts"'); }
        catch (_) { tsClaim = new Record($app.findCollectionByNameOrId("app_settings")); tsClaim.set("key", "jdf_scan_ts"); }
        tsClaim.set("value", Date.now());
        $app.save(tsClaim);
    } catch (_) {}

    var jdfPath = $os.getenv("JDF_PATH") || '/pb/jdf/';
    try {
        var setting = $app.findFirstRecordByFilter("app_settings", 'key = "jdf_folder_path"');
        if (setting && !$os.getenv("JDF_PATH")) { // Only use DB setting if env var is not set
            var raw = String(setting.get("value") || '');
            // JSON fields round-trip as their JSON-encoded text (e.g. "/pb/jdf/"),
            // so strip the enclosing quotes if present.
            if (raw.length >= 2 && raw.charAt(0) === '"' && raw.charAt(raw.length - 1) === '"') {
                try { raw = JSON.parse(raw); } catch (_) { raw = raw.slice(1, -1); }
            }
            if (raw && raw.length > 0) jdfPath = raw;
        }
    } catch (e) { /* use default */ }
    if (jdfPath.charAt(jdfPath.length - 1) !== '/') jdfPath += '/';

    console.log("[JDF Scan] Starting scan at: " + jdfPath + (force ? " (FORCE)" : ""));
    var entries;
    try {
        entries = $os.readDir(jdfPath);
    } catch (e) {
        console.log("[JDF Scan] ReadDir failed: " + e);
        result.skipped = true;
        result.error = "Directory niet leesbaar: " + jdfPath;
        return result;
    }

    var totalFiles = entries ? entries.length : 0;
    console.log("[JDF Scan] Total entries found: " + totalFiles);

    result.files_found = entries ? entries.length : 0;
    if (!entries || entries.length === 0) {
        persistLastScan(result);
        return result;
    }

    var jdfCollection;
    try {
        jdfCollection = $app.findCollectionByNameOrId("jdf_orders");
    } catch (e) {
        result.skipped = true;
        result.error = "jdf_orders collectie niet gevonden";
        return result;
    }

    var pressRecords;
    try {
        pressRecords = $app.findRecordsByFilter("persen", "1=1");
    } catch (e) {
        pressRecords = [];
    }

    // Build set of finished order numbers to skip permanently
    var finishedOrders = {};
    try {
        var finishedRecs = $app.findRecordsByFilter("drukwerken", "is_finished = true");
        for (var f = 0; f < finishedRecs.length; f++) {
            var fn = String(finishedRecs[f].getString("order_nummer")).trim();
            if (fn) finishedOrders[fn] = true;
        }
    } catch (e) { /* drukwerken not available */ }

    // Pre-load all existing jdf_orders into a map keyed by filename.
    // Avoids one DB query per candidate file (was the main bottleneck).
    var existingOrdersMap = {};
    try {
        var allOrders = $app.findRecordsByFilter("jdf_orders", "1=1");
        for (var o = 0; o < allOrders.length; o++) {
            existingOrdersMap[allOrders[o].getString("jdf_bestandsnaam")] = allOrders[o];
        }
    } catch (e) { /* fall back to per-file lookup below */ }

    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        var name = entry.name();

        if (entry.isDir()) continue;

        // Only process DT*.xml files
        if (!/^DT\d/i.test(name)) continue;
        var nameLower = name.toLowerCase();
        if (nameLower.indexOf('.xml') === -1 && nameLower.indexOf('.jdf') === -1) continue;

        result.candidates++;

        // Extract order number from filename (DT10023.xml → "10023")
        var dtMatch = name.match(/^DT(\d+)/i);
        var orderNr = dtMatch ? dtMatch[1] : '';

        // Skip permanently if order is fully printed
        if (!force && orderNr && finishedOrders[orderNr]) { result.skipped_files++; continue; }

        var filePath = jdfPath + name;
        var existing = existingOrdersMap[name] || null;

        // Skip stat entirely for files we already know are pre-2026 (modtime can't go backwards)
        var storedModTime = existing ? existing.getInt("jdf_mod_time") : 0;
        if (storedModTime > 0 && storedModTime < 1735689600) { result.skipped_files++; continue; }

        var modTimeUnix = 0;
        var fileSize = 0;
        try {
            result.stat_calls++;
            var info = entry.info();
            fileSize = info.size();
            modTimeUnix = info.modTime().unix();
        } catch (e) { /* fall back to content.length after read */ }

        // Always skip files not modified since before 2026-01-01 (ook bij force)
        if (modTimeUnix > 0 && modTimeUnix < 1735689600) { result.skipped_files++; continue; }

        // Skip if modification time unchanged
        if (!force && existing && modTimeUnix > 0 && existing.getInt("jdf_mod_time") === modTimeUnix) { result.skipped_files++; continue; }

        var content;
        try {
            var bytes = $os.readFile(filePath);
            content = bytesToString(bytes);
            if (!fileSize) fileSize = bytes.length;
        } catch (e) {
            console.log("[JDF Watcher] readFile failed for " + name + ": " + e);
            continue;
        }

        var parsed;
        try {
            parsed = parseXmlOrder(content);
        } catch (e) {
            console.log("[JDF Watcher] parse failed for " + name + ": " + e);
            continue;
        }

        if (!parsed.order_nummer) {
            console.log("[JDF Watcher] No order_nummer parsed from: " + name);
            continue;
        }

        // Skip orders with a print date before 2026
        var printDate = parsed.target_print_date || parsed.deadline || '';
        if (printDate && printDate < '2026-01-01') { result.skipped_files++; continue; }

        result.read_files++;

        var pressId = '';
        if (parsed.pers_device_id && pressRecords) {
            var deviceLower = parsed.pers_device_id.toLowerCase();
            for (var p = 0; p < pressRecords.length; p++) {
                if (pressRecords[p].getString("naam").toLowerCase() === deviceLower) {
                    pressId = pressRecords[p].id;
                    break;
                }
            }
        }

        var record = existing || new Record(jdfCollection);
        record.set("order_nummer", parsed.order_nummer);
        record.set("order_naam", parsed.order_naam);
        record.set("klant", parsed.klant);
        record.set("pers_device_id", parsed.pers_device_id);
        if (pressId) record.set("pers", pressId);
        record.set("ex_omw", parsed.ex_omw);
        record.set("paginas", parsed.paginas || 0);
        record.set("versies", parsed.versies);
        record.set("aantal_versies", parsed.aantal_versies);
        try { record.set("katernen", parsed.katernen || []); } catch (_) {}
        if (parsed.deadline) record.set("deadline", parsed.deadline);
        if (parsed.target_print_date) record.set("target_print_date", parsed.target_print_date);
        record.set("csr", parsed.csr);
        record.set("papier", parsed.papier);
        if (parsed.totaal_oplage) record.set("totaal_oplage", parsed.totaal_oplage);
        record.set("kleuren_voor", parsed.kleuren_voor);
        record.set("kleuren_achter", parsed.kleuren_achter);
        record.set("vouwwijze", parsed.vouwwijze);
        record.set("bruto_breedte", parsed.bruto_breedte);
        record.set("bruto_hoogte", parsed.bruto_hoogte);
        try { if (parsed.finishing_style !== undefined) record.set("finishing_style", parsed.finishing_style); } catch (_) {}
        record.set("jdf_bestandsnaam", name);
        record.set("jdf_grootte", fileSize);
        if (modTimeUnix > 0) record.set("jdf_mod_time", modTimeUnix);

        try {
            $app.save(record);
            if (existing) result.updated_records++;
            else result.new_records++;

            // Auto-populate 'papier' collection if this paper is new.
            // Collect distinct paper_refs from top-level + each katern.
            if (parsed.papier || (parsed.katernen && parsed.katernen.length > 0)) {
                try {
                    var seenRefs = {};
                    var refsToAdd = [];
                    if (parsed.papier) { seenRefs[parsed.papier] = true; refsToAdd.push(parsed.papier); }
                    for (var kp = 0; kp < (parsed.katernen || []).length; kp++) {
                        var kpRef = parsed.katernen[kp].papier;
                        if (kpRef && !seenRefs[kpRef]) { seenRefs[kpRef] = true; refsToAdd.push(kpRef); }
                    }
                    var papierCol = $app.findCollectionByNameOrId("papier");

                    for (var rp = 0; rp < refsToAdd.length; rp++) {
                        var ref = refsToAdd[rp];
                        var parsedRef = parsePaperRef(ref);

                        // Check existence: for structured refs match on (naam, klasse) —
                        // grammage and breedte are per-job and not part of paper identity.
                        // Fall back to matching the raw string against naam otherwise.
                        var filter;
                        if (parsedRef) {
                            filter = 'naam = "' + parsedRef.naam.replace(/"/g, '\\"') +
                                     '" && klasse = "' + parsedRef.klasse.replace(/"/g, '\\"') + '"';
                        } else {
                            filter = 'naam = "' + ref.replace(/"/g, '\\"') + '"';
                        }

                        var papierExists = false;
                        try {
                            $app.findFirstRecordByFilter("papier", filter);
                            papierExists = true;
                        } catch (_) {}

                        if (!papierExists) {
                            var papierRec = new Record(papierCol);
                            if (parsedRef) {
                                papierRec.set("naam", parsedRef.naam);
                                papierRec.set("klasse", parsedRef.klasse);
                                papierRec.set("fabrikant", parsedRef.fabrikant);
                            } else {
                                papierRec.set("naam", ref);
                            }
                            $app.save(papierRec);
                            console.log("[JDF Watcher] Added new paper to collection: " + ref);
                        }
                    }
                } catch (pe) {
                    console.log("[JDF Watcher] Failed to auto-add paper: " + pe);
                }
            }
        } catch (e) {
            console.log("[JDF Watcher] Save failed for " + name + ": " + e);
        }
    }

    console.log("[JDF Scan] ✅ Done — ⏱ " + Math.round((Date.now() - scanStart) / 1000) + "s | 📂 " + result.files_found + " entries | 🎯 " + result.candidates + " candidates | ⏭ " + result.skipped_files + " skipped | 📖 " + result.read_files + " read | ✨ " + result.new_records + " new | 🔄 " + result.updated_records + " updated");

    persistLastScan(result);
    return result;
}

module.exports = { runJdfScan: runJdfScan };
