let arr =[
    {id:2,name:'����B',parentId:0},
    {id:3,name:'����C',parentId:1},
    {id:1,name:'����A',parentId:2},
    {id:4,name:'����D',parentId:1},
    {id:5,name:'����E',parentId:2},
    {id:6,name:'����F',parentId:3},
    {id:7,name:'����G',parentId:2},
    {id:8,name:'����H',parentId:4}
];
/**
 * ����ת��  �ǵݹ����
 * ��������Ͷ����໥����  ʱ�临�Ӷ�O(n)
 * @param {Object} list
 */
function totree(list,parId) {
    let obj = {};
    let result = [];
    //������������תΪ��ֵ�Խṹ (����������obj���໥����)
    list.map(el => {
        obj[el.id] = el;
    })
    for(let i=0, len = list.length; i < len; i++) {
        let id = list[i].parentId;
        if(id == parId) {
            result.push(list[i]);
            continue;
        }
        if(obj[id].children) {
            obj[id].children.push(list[i]);
        } else {
            obj[id].children = [list[i]];
        }
    }
    return result;
}

let res1 = totree(arr,0)

/**
 * ����ת��  �ݹ����
 */
function toTree(list,parId){
	let len = list.length
	function loop(parId){
		let res = [];
		for(let i = 0; i < len; i++){
			let item = list[i]
			if(item.parentId === parId){
				item.children = loop(item.id)
				res.push(item)
			}
		}
		return res
	}
	return loop(parId)
}

let result = toTree(arr,0)

/**
 * ��ת�����ƽ���ṹ   
 * ������ȱ���  ��ջ  ����ȳ�
 */
function deep(node){
	let stack = node,
		data = [];
	while(stack.length != 0){
		let pop = stack.pop();
		data.push({
			id: pop.id,
			name: pop.name,
			parentId: pop.parentId
		})
		let children = pop.children
		if(children){
			for(let i = children.length-1; i >=0; i--){
				stack.push(children[i])
			}
		}
	}
	return data
}
//console.log(deep(res1))

/**
 * ��ת�����ƽ���ṹ   
 * ������ȱ���  �ݹ�
 */
function deepTraversal(data) {
    const result = [];
    data.forEach(item => {
        const loop = data => {
            result.push({
            	id: data.id,
				name: data.name,
				parentId: data.parentId
            });
            let child = data.children
            if(child){
            	for(let i = 0; i < child.length; i++){
					loop(child[i])
				}
            }
        }
        loop(item);
    })
    return result;
}
//console.log(deepTraversal(res1))

/**
 * �������
 * ����  �Ƚ��ȳ�
 */
function wideTraversal(node){
	let stack = node,
		data = [];
	while(stack.length != 0){
		let shift = stack.shift();
		data.push({
			id: shift.id,
			name: shift.name,
			parentId: shift.parentId
		})
		let children = shift.children
		if(children){
			for(let i = 0; i < children.length; i++){
				stack.push(children[i])
			}
		}
	}
	return data
}
//console.log(wideTraversal(res1))