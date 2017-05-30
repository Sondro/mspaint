let webpack = require('webpack');

module.exports = (env={}, args={}) => {

    let config = {
        entry : {
            root: './web/modules/root.js',
        },
        output: {
            path: __dirname  + '/web/bundles',
            filename: '[name].js',
        },
        module: {
            loaders: [
                {
                    test: /\.js$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: {
                                presets: babelPresets = [
                                    ['es2015', { modules: false }],
                                    'stage-0'
                                ]
                            }
                        }
                    ]
                },
                {
                    test: /\.scss/,
                    use: [
                        { loader:'style-loader' },
                        { loader:'raw-loader' },
                        { loader:'sass-loader' },
                    ]
                },
                {
                    test: /\.js$/,
                    enforce: 'pre',
                    loader: 'eslint-loader',
                    exclude: __dirname + '/web/modules/lib',
                    options: {
                        configFile: '.eslintrc',
                        failOnWarning: false,
                        failOnError: false,
                        emitError: false,
                        fix: true
                    }
                }
            ],
        },
        plugins: [
            new webpack.DefinePlugin({
                __DEV__: env.dev,
                __WEB__: true,
            }),
        ],
        resolve: {
            extensions: ['.js', '.json', '.jsx'],
            alias: {
                '#js': __dirname + '/web/modules/js',
                '#css': __dirname + '/web/modules/css',
                '#lib': __dirname + '/web/modules/lib',
                '#shared': __dirname + '/shared',
                'd3': __dirname + '/web/modules/lib/d3',
            }
            
        },
        devtool: env.dev ? 'source-map' : false,
    };

    return config;

}
