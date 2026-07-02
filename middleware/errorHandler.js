module.exports = (err, req, res, next) => {
    // Log the full error to terminal (for debugging)
    console.error('❌ ERROR:', err.message);
    console.error('📚 STACK:', err.stack);
    
    // Send response
    res.status(500).json({ 
        message: 'Something went wrong',
        error: err.message  // TEMPORARY: show the error (remove after debugging)
    });
};