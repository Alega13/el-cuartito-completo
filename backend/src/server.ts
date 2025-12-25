import config from './config/env';
import app from './app';

app.listen(config.PORT, () => {
    console.log(`🚀 El Cuartito API running on port ${config.PORT}`);
    console.log(`Environment: ${config.NODE_ENV}`);
});
