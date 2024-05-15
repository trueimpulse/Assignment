module.exports = function (handler) {
    return async (req, res, next) => {
        try {
            await handler(req, res)
        } catch (error) {
            res.status(500).send({
                message: "Something went wrong!",
                error: error?.message,
                status: 500
            })
        }
    }
}