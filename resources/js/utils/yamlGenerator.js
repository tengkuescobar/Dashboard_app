import * as yaml from 'js-yaml';

/**
 * Generate YAML string from Quick Config wizard
 * @param {string} type - e.g. 'bar_chart', 'line_chart', 'donut_chart'
 * @param {string} title - Chart title
 * @param {string} dataSource - 'dummy' or 'catalog'
 * @param {object} data - Either dummy rows or query config
 * @returns {string} - Generated YAML string
 */
export function generateYamlFromQuickConfig(type, title, dataSource, data) {
    const config = {
        title: title || 'Untitled Chart',
        template: type,
    };

    if (dataSource === 'dummy') {
        config.data_dummy = data.rows || [];
    } else if (dataSource === 'catalog') {
        config.data_query = {
            id: data.queryId,
            dimension: data.dimension,
            metric: data.metric,
            params: data.params || {}
        };
    }

    // Convert object to YAML string
    return yaml.dump(config, {
        indent: 2,
        lineWidth: -1, // Don't wrap long lines
        noRefs: true
    });
}
