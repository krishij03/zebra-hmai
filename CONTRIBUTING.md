# Setting up Zebra-HMAI

---

## Environment and Device used

* **OS:** Linux
* **Distro:** Ubuntu 22.04 LTS
* **Project:** [Zebra-HMAI GitHub Repo](https://github.com/krishij03/zebra-hmai)
* **Branch:** main
* **NodeJS version:** v18.19.1
* **Local Prometheus version:** 2.45.3+ds (debian/sid)
* **Local Grafana version:** 11.6.1

---

## Setup Steps

### Cloning the repo and switching to main branch

```bash
git clone git@github.com:krishij03/zebra-hmai.git
git checkout main
```

---

### For non-dockerized setup

1. Move into `src` directory and install necessary packages:

   ```bash
   cd src
   npm i
   ```

2. Copy `Zconfig.template.json` to `Zconfig.json` (inside `src/config` directory).

3. Start MongoDB, Prometheus and Grafana instances using either Docker or local installation.

**Using Docker:**

```bash
docker run -d -p 27017:27017 mongo && \
docker run -d -p 9090:9090 prom/prometheus && \
docker run -d -p 9000:9000 grafana/grafana
```

**Using Local Installation:**
Install from binaries and verify:

```bash
prometheus --version && grafana-server --version
```

Expected Output:

```
prometheus, version 2.45.3+ds
...
Version 11.6.1 (Grafana)
```

4. Start the development server:

```bash
npm run dev
```

---

### For dockerized setup

Build and start the Docker container:

```bash
docker compose up --build
```

---

> **Note**: For non-dockerized setup the frontend is on port **3090**, for containerized setup it's on **3390**.

---

## Testing with demo data in MongoDB

As no demodata has been provided, testing `/mongo` routes fully isn't possible.
However, some demo data was added manually based on `models` definitions. Database connection was successful.

## Final Notes

Local setup is complete and all components (frontend, MongoDB, Prometheus, Grafana) are working. However, full metric and RMF data visualization couldn't be tested due to lack of provided data.

Thanks.
