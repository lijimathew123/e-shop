
var db=require('../config/connection')
var collections=require('../config/collections')
var objectId=require('mongodb').ObjectId
const bcrypt=require('bcrypt')
const Razorpay=require('razorpay')

var instance = new Razorpay({ key_id: 'rzp_test_afsNyW1R6IagKj', key_secret: 'susDuQlrGESiuzg0qJYK3DXqy' })


const { response } = require('express')
module.exports={
    doSignup: (userData)=>{

        return new Promise(async(resolve,reject)=>{
        userData.Password=await bcrypt.hash(userData.Password,10)
        db.get().collection(collections.USER_COLLECTION).insertOne(userData).then((data)=>{
        resolve(data.insertedId)
   })
    
    })
    },


    doLogin:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            let loginstatus=false
            let response={}
            let user=await db.get().collection(collections.USER_COLLECTION).findOne({Email:userData.Email})
            if(user){
            bcrypt.compare(userData.Password,user.Password).then((status)=>{
                if(status){
                    console.log("login successfully");
                    response.user=user
                    response.status=true
                    resolve(response)
                    
                }else{
                    console.log('login failed')
                    resolve({status:false})
                }

            })
        }else{
            console.log('login failed');
            resolve({status:false})
        }
       
        })
    
    },
   



    addToCart:(proId,userId)=>{
    let proObj = {
        item:objectId(proId),
        quantity:1
    }
        return new Promise(async(resolve,reject)=>{
        let userCart= await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
        if(userCart){
            let proExist =userCart.products.findIndex(product=>product.item == proId)
            console.log(proExist);
            if (proExist!=-1){
                db.get().collection(collections.CART_COLLECTION)
                .updateOne({'products.item': objectId(proId)},
                {
                    $inc : {'products.$.quantity':1}
                }
                ).then(()=>{
                    resolve()
                })
            }else {
                db.get().collection(collections.CART_COLLECTION)
                .updateOne({user:objectId(userId)},
                {
                    $push: {products:proObj}
                }
                ).then((response)=>{
                    resolve()
                })
            }
        }else {
            let cartObj = {
                user:objectId(userId),
                products:[proObj]
            }
            db.get().collection(collections.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                resolve()
            })
        }
    })
   },
  
  
  
   getCartProducts: (userId)=>{
        return new Promise(async(resolve,reject)=>{
            let cartItem = await db.get().collection(collections.CART_COLLECTION).aggregate([
                {
                    $match: {user: objectId(userId)}
                },
                {
                    $unwind: '$products'
                },
                {
                    $project: {
                        item: '$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup : {
                        from :collections.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as: 'product'
                    }
                },
                {
                       $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                       }
                }

            ]).toArray()
            resolve(cartItem)
        })
    },
       
    
    
    
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
              resolve(count)
        })

        },
       
       
    
    changeProductQuantity:(details)=>{
            details.count=parseInt(details.count)
            details.quantity=parseInt(details.quantity)

            return new Promise((resolve,reject)=>{
               
                if(details.count == -1 && details.quantity == 1){
                    db.get().collection(collections.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart)},
                    {
                        $pull:{products:{item:objectId(details.product)}}
                    }
                    ).then((response)=>{
                        resolve({removeProduct:true})
                    })
                }else{
                    db.get().collection(collections.CART_COLLECTION)
                    .updateOne({_id:objectId(details.cart),'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':details.count}
                    }).then((response)=>{
                        resolve({status:true})
                    })
                }
            })
        },
        
        
        
        
    getTotalAmount:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let total = await db.get().collection(collections.CART_COLLECTION).aggregate([
                    {
                        $match: { user: objectId(userId)}
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity:'$products.quantity'
                        }
                    },
                    {
                        $lookup : {
                            from :collections.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as: 'product'
                        }
                    },
                    {
                           $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                           }
                    },
                    {
                        $group:{
                            _id:null,
                            total:{$sum:{$multiply:['$quantity',{$convert:{input:'$product.price',to:'int'}}]}}
                        }
                    }
    
                ]).toArray()
                  console.log(total[0].total);
                  resolve(total[0].total)
            })
        },
        
        deleteCartProduct:(proId)=>{
            return new Promise((resolve,reject)=>{
                db.get().collection(collections.CART_COLLECTION).remove({user:objectId(proId)}).then((response)=>{
                    resolve(response)
                })
            })
        },
        
    placeOrder:(order,products,total)=>{
         return new Promise((resolve,reject)=>{
            console.log(order,products,total);
            let status=order['payment-method'] === 'COD'?'placed':'pending'
            let orderObj={
                deliveryDetails:{
                    mobile:order.mobile,
                    address:order.address,
                    pincode:order.pincode

                },
                userId:objectId(order.userId),
                paymentMethod:order['payment-method'],
                products:products,
                totalAmount:total,
                status:status,
                date:new Date()
            }


            db.get().collection(collections.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                db.get().collection(collections.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                console.log(response.insertedId);
                resolve(response.insertedId)
            })
            
         })
        },
        
        
        
    getCartProductList:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                let products = await db.get().collection(collections.CART_COLLECTION).findOne({user:objectId(userId)})
                console.log(products);
                resolve(products)
            })
        },
       
       
       
     getUserOrders:(userId)=>{
            return new Promise(async(resolve,reject)=>{
                // console.log(userId);
                let orders = await db.get().collection(collections.ORDER_COLLECTION)
                .find({userId:objectId(userId)}).toArray()
                console.log(orders);
                resolve(orders)
            })
        },
        
        
        
     getOrderProducts:(orderId)=>{
            return new Promise(async(resolve,reject)=>{
                let orderItems= await db.get().collection(collections.ORDER_COLLECTION).aggregate([
                    {
                        $match: {_id:objectId(orderId)}
                    },
                    {
                        $unwind: '$products'
                    },
                    {
                        $project: {
                            item: '$products.item',
                            quantity:'$products.quantity'
                        }
                    },
                    {
                        $lookup : {
                            from :collections.PRODUCT_COLLECTION,
                            localField:'item',
                            foreignField:'_id',
                            as: 'product'
                        }
                    },
                    {
                           $project:{
                            item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                           }
                    }
    
                ]).toArray()
                console.log(orderItems);
                resolve(orderItems)
            })
        },
       
    generateRazorpay:(orderId,total)=>{
            console.log(orderId);
            return new Promise((resolve,reject)=>{


                //  var options={
                //     amount: total,
                //     currency: "INR",
                //     receipt:""+orderId
                // };
                instance.orders.create({
                    amount: total,
                    currency: "INR",
                    receipt: ""+orderId,
                    notes: {
                      key1: "value3",
                      key2: "value2"
                    }
                  })
                
            })
        }
    }

