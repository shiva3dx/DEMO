import bpy
import os

def inspect_blender_scene():
    print("\n" + "="*50)
    print(" RIVA STUDIOS - BLENDER SCENE SIZE & MESH INSPECTOR")
    print("="*50 + "\n")
    
    # 1. Inspect heavy meshes
    mesh_objects = [obj for obj in bpy.context.scene.objects if obj.type == 'MESH']
    
    mesh_data = []
    total_verts = 0
    total_faces = 0
    
    for obj in mesh_objects:
        # Calculate verts and faces
        verts = len(obj.data.vertices)
        faces = len(obj.data.polygons)
        total_verts += verts
        total_faces += faces
        
        # Check if it uses instancing (shared mesh data)
        users = obj.data.users
        is_instanced = users > 1
        
        mesh_data.append({
            'name': obj.name,
            'verts': verts,
            'faces': faces,
            'is_instanced': is_instanced,
            'users': users,
            'data_name': obj.data.name
        })
        
    # Sort meshes by face count (heaviest first)
    mesh_data.sort(key=lambda x: x['faces'], reverse=True)
    
    print(f"Total Mesh Objects: {len(mesh_objects)}")
    print(f"Total Scene Vertices: {total_verts:,}")
    print(f"Total Scene Polygons (Faces): {total_faces:,}\n")
    
    print("-" * 65)
    print(f"{'Object Name':<30} | {'Faces':<10} | {'Verts':<10} | {'Instanced?'}")
    print("-" * 65)
    
    # Print top 20 heaviest meshes
    for item in mesh_data[:20]:
        inst_status = f"Yes ({item['users']} users)" if item['is_instanced'] else "NO (Unique Mesh)"
        print(f"{item['name'][:30]:<30} | {item['faces']:<10,} | {item['verts']:<10,} | {inst_status}")
        
    # 2. Check for duplicate mesh structures that should be instanced
    print("\n" + "="*50)
    print(" INSTANCING ANALYSIS (POTENTIAL SIZE SAVERS)")
    print("="*50)
    
    # Group by vert/face signature to find meshes that are identical but not linked
    signatures = {}
    for item in mesh_data:
        if item['is_instanced']:
            continue # already instanced
        sig = (item['verts'], item['faces'])
        if sig not in signatures:
            signatures[sig] = []
        signatures[sig].append(item['name'])
        
    found_duplicates = False
    for sig, objs in signatures.items():
        if len(objs) > 2 and sig[1] > 500: # threshold: more than 2 duplicates, > 500 faces
            found_duplicates = True
            print(f"\n⚠️ Found {len(objs)} unlinked objects with identical geometry ({sig[1]:,} faces):")
            print(f"   Sample Objects: {', '.join(objs[:5])}...")
            print(f"   💡 Recommendation: Link these data blocks (Ctrl+L -> Link Data) to reduce file size!")

    if not found_duplicates:
        print("No heavy unlinked duplicates found. Good job using instancing!")
        
    # 3. Inspect Heavy Textures
    print("\n" + "="*50)
    print(" IMAGE TEXTURE SIZE ANALYSIS")
    print("="*50)
    
    images = bpy.data.images
    image_data = []
    
    for img in images:
        # Get dimensions
        w, h = img.size
        # Skip render targets or empty images
        if w == 0 or h == 0:
            continue
            
        filepath = img.filepath
        size_bytes = 0
        if filepath and os.path.exists(bpy.path.abspath(filepath)):
            size_bytes = os.path.getsize(bpy.path.abspath(filepath))
            
        image_data.append({
            'name': img.name,
            'width': w,
            'height': h,
            'size_mb': size_bytes / (1024 * 1024) if size_bytes else 0,
            'filepath': filepath
        })
        
    # Sort images by resolution (width * height)
    image_data.sort(key=lambda x: x['width'] * x['height'], reverse=True)
    
    if image_data:
        print(f"\nTotal Textures: {len(image_data)}\n")
        print("-" * 65)
        print(f"{'Texture Name':<25} | {'Resolution':<12} | {'File Size':<10} | {'File Path'}")
        print("-" * 65)
        for img in image_data[:10]:
            size_str = f"{img['size_mb']:.2f} MB" if img['size_mb'] > 0 else "Unknown"
            print(f"{img['name'][:25]:<25} | {img['width']}x{img['height']:<6} | {size_str:<10} | {img['filepath']}")
            if img['width'] > 2048 or img['height'] > 2048:
                print(f"   💡 Recommendation: Resize this texture to 2048x2048 or 1024x1024!")
    else:
        print("No image textures loaded in this project.")
        
    print("\n" + "="*50)
    print(" INSPECTION COMPLETE")
    print("="*50 + "\n")

# Run the inspection
inspect_blender_scene()
