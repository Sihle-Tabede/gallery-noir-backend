const express=require('express');
const db=require('../config/db');
const auth=require('../middleware/auth');
const validation=require('../utils/validation');
const {badRequest}=require('../utils/errors');
const router=express.Router();
router.use(auth,(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
router.get('/',async(req,res)=>{
    const {rows}=await db.query('SELECT slug FROM wishlists WHERE user_id=$1 ORDER BY created_at DESC',[req.user.id]);
    res.json(rows.map(row=>row.slug));
});
router.put('/:slug',async(req,res)=>{
    const slug=validation.slug(req.params.slug);
    await db.withTransaction(async(client)=>{
        await client.query('SELECT id FROM users WHERE id=$1 FOR UPDATE',[req.user.id]);
        const {rows}=await client.query('SELECT COUNT(*)::int AS total FROM wishlists WHERE user_id=$1',[req.user.id]);
        if(rows[0].total>=200) throw badRequest('Your wishlist can hold up to 200 works.');
        await client.query('INSERT INTO wishlists(user_id,slug) VALUES($1,$2) ON CONFLICT DO NOTHING',[req.user.id,slug]);
    });
    res.status(204).end();
});
router.delete('/:slug',async(req,res)=>{
    await db.query('DELETE FROM wishlists WHERE user_id=$1 AND slug=$2',[req.user.id,validation.slug(req.params.slug)]);
    res.status(204).end();
});
module.exports=router;
