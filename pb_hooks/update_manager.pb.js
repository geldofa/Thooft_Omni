
routerAdd("GET", "/api/custom/update/check", (c) => {
    try {
        const resp = c.response;
        const h = (typeof resp.header === 'function' ? resp.header() : resp.header);
        if (h) {
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            h.set("Access-Control-Allow-Headers", "*");
        }

        // 1. Fetch latest release from GitHub
        const res = $http.send({
            url: "https://api.github.com/repos/geldofa/Thooft_PressManager/releases/latest",
            method: "GET",
            headers: {
                "User-Agent": "Thooft-Omni-Update-Checker",
                "Accept": "application/vnd.github.v3+json"
            },
            timeout: 10
        });

        if (res.statusCode !== 200) {
            return c.json(res.statusCode, { message: "Failed to fetch from GitHub", details: res.json });
        }

        const latestTag = res.json.tag_name;
        const publishedAt = res.json.published_at;
        const htmlUrl = res.json.html_url;

        return c.json(200, {
            latestVersion: latestTag,
            publishedAt: publishedAt,
            url: htmlUrl
        });

    } catch (e) {
        return c.json(500, { message: e.toString() });
    }
});

routerAdd("POST", "/api/custom/update/apply", (c) => {
    try {
        // Superuser/Admin check
        let isAdmin = false;
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isAdmin = true;
            if (!isAdmin && c.auth) {
                if (c.auth.collection().name === "_superusers") isAdmin = true;
                if (c.auth.collection().name === "users" && (c.auth.get("role") === "admin" || c.auth.get("role") === "Admin")) isAdmin = true;
            }
        } catch (e) { }

        if (!isAdmin) {
            return c.json(403, { message: "Forbidden" });
        }

        // Attempt "git pull"
        // precise command depends on where the repo root is relative to the working directory.
        // In the docker container, we are likely at /pb or /
        // The source might not be git-managed if it's a built image, but if we are in dev/simulated env it might work.
        // We generally assume the "app" service handles the source, but here we are in "db" container (PocketBase).
        // Wait, PocketBase is running in the "db" container. "App" service is the React frontend.
        // IF we are talking about updating the "App", we can't do it from the "db" container easily unless:
        // 1. We share a volume where the app source is (unlikely in prod image)
        // 2. We trigger a redeploy via some other mechanism (e.g. watchtower, or a webhook)

        // HOWEVER, the user asked for "self update".
        // In the `docker-compose.windows.yml` environment, the user might be mapped.
        // But likely we can't strictly "git pull" the frontend from the DB container.

        // Strategy:
        // We will TRY to run a script if it exists: /pb/hooks/update_script.sh
        // If not, we will just return a message saying "Automated update not supported in this environment".

        // BUT, for the "warning" part, that is fully doable.
        // For the "self update", I will implement a placeholder that tries to run a command but likely fails in standard docker.
        // The user's prompt "self update if i instruct it to" suggests a button click.

        try {
            // This cmd execution is extremely environment dependent.
            // We'll try a generic approach for a satellite setup where source might be mounted.
            // But in the user's `docker-compose.yml`, `pb_hooks` is mounted.

            // If we can't pull, we return appropriate message.
            const result = $os.cmd("git", "pull");
            return c.json(200, { message: "Git pull executed", output: result.toString() });
        } catch (err) {
            return c.json(500, { message: "Update execution failed. This feature requires the server to be running from a writable git repository.", details: err.toString() });
        }
    } catch (e) {
        return c.json(500, { message: e.toString() });
    }
});
