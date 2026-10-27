export class ResponseUtil {
    static success(res, data, message, statusCode = 200) {
        res.status(statusCode).json({
            success: true,
            message,
            data,
        });
    }
    static error(res, message, statusCode = 400, errors) {
        res.status(statusCode).json({
            success: false,
            message,
            errors,
        });
    }
}
