var express = require('express');
var router = express.Router();
var productHelpers =require('../helpers/product-helpers')
/* GET users listing. */
router.get('/', function(req, res, next) {
  productHelpers.getAllProducts().then((product)=>{
  
  res.render('admin/view-products',{admin:true,product})
   })
  
 });


router.get('/add-product',function(req,res){
  res.render('admin/add-product',{admin:true})
})


router.post('/add-product',(req,res)=>{

   
    productHelpers.addProduct(req.body,(id)=>{
      let image=req.files.image
      image.mv('./public/product-images/'+id+'.jpg',(err)=>{
        if(!err){
          res.render('admin/add-product')

        }else{
          console.log(err)
        }
      })
      
    })
})

router.get('/delete-product/:id',(req,res)=>{
   let proId=req.params.id
   
   productHelpers.deleteProduct(proId).then((response)=>{
    res.redirect('/admin/',{admin:true})
   })
   
})


router.get('/edit-product/:id',async(req,res)=>{
  let product=await productHelpers.getProductDetails(req.params.id)
  console.log(product);
  res.render('admin/edit-product',{product,admin:true})
})


router.post('/edit-product/:id',(req,res)=>{
  console.log(req.params.id)
  let id=req.params.id
  productHelpers.updateProduct(req.params.id,req.body).then(()=>{
    res.redirect('/admin',{admin:true})
    if(req.files.image){
      let image=req.files.image
      image.mv('./public/product-images/'+id+'.jpg')
    }
  })
})


router.get('/products',(req,res)=>{
productHelpers.getProductDetails().then((product)=>{
  res.render('/admin/products',{admin:true,product})
})
})

module.exports = router;
