import { useState, useEffect } from 'react';
import * as yaml from 'js-yaml';
import axios from 'axios';

// Cache catalog so we don't fetch it multiple times if many charts use it
let catalogCache = null;

export default function useChartData(yamlString) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState([]);
    const [config, setConfig] = useState(null);

    useEffect(() => {
        let isMounted = true;

        const fetchData = async () => {
            if (!yamlString) return;

            setLoading(true);
            setError(null);

            try {
                // 1. Parse YAML
                const parsed = yaml.load(yamlString);
                if (isMounted) setConfig(parsed);

                if (!parsed || !parsed.data_source) {
                    throw new Error("Invalid chart configuration: Missing data_source");
                }

                // 2. Handle Dummy Data
                if (parsed.data_source.type === 'dummy') {
                    const rows = parsed.data_source.rows || [];
                    const standardized = rows.map(r => ({
                        label: String(r.label || 'Unknown'),
                        value: Number(r.value || 0)
                    }));
                    if (isMounted) setData(standardized);
                } 
                // 3. Handle Catalog Data
                else if (parsed.data_source.type === 'catalog') {
                    const { query_id, dimension, metric } = parsed.data_source;
                    if (!query_id || !dimension || !metric) {
                        throw new Error("Invalid catalog configuration: Missing query_id, dimension, or metric");
                    }

                    // Fetch catalog if not cached
                    if (!catalogCache) {
                        const catRes = await axios.get('/api/query-catalog');
                        catalogCache = catRes.data?.queries || [];
                    }

                    const queryInfo = catalogCache.find(q => q.id === query_id);
                    if (!queryInfo) {
                        throw new Error(`Query ID '${query_id}' not found in catalog`);
                    }

                    // Fetch real data from the endpoint defined in catalog
                    // In a real app, you would append params here (e.g. ?year=2026)
                    const dataRes = await axios.get(queryInfo.endpoint);
                    const rawData = dataRes.data?.data || [];

                    // Computation Layer: Map to standardized format
                    const standardized = rawData.map(row => ({
                        label: String(row[dimension] || 'Unknown'),
                        value: Number(row[metric] || 0)
                    }));

                    if (isMounted) setData(standardized);
                } 
                else {
                    throw new Error(`Unsupported data source type: ${parsed.data_source.type}`);
                }

            } catch (err) {
                console.error("Error computing chart data:", err);
                if (isMounted) setError(err.message || "An error occurred");
                if (isMounted) setData([]);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [yamlString]);

    return { loading, error, data, config };
}
