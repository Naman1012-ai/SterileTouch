import * as THREE from 'three';
import { MedicalScanSeries } from '../types/medical';

export type ShadingMode = 'CLINICAL' | 'HOLOGRAPHIC';

export class AnatomicalMeshBuilder {
  /**
   * Build complete 3D scene mesh based on active clinical case or uploaded scan
   */
  public static buildAnatomicalScene(
    scan: MedicalScanSeries,
    shadingMode: ShadingMode,
    clippingPlane?: THREE.Plane
  ): THREE.Group {
    const root = new THREE.Group();
    root.name = 'AnatomicalRoot';

    if (scan.id === 'scan-001') {
      root.add(this.createSkullWithHematoma(shadingMode, clippingPlane));
    } else if (scan.id === 'scan-002') {
      root.add(this.createThoracicRibCage(shadingMode, clippingPlane));
    } else if (scan.customSlices && scan.customSlices.length > 0) {
      root.add(this.createOrthogonalCube(scan, shadingMode, clippingPlane));
    } else {
      root.add(this.createFemurFracture(shadingMode, clippingPlane));
    }

    return root;
  }

  /**
   * CASE 1: 3D Cranial Skull with Temporal Craniotomy & Subdural Hematoma
   */
  public static createSkullWithHematoma(
    shading: ShadingMode,
    clippingPlane?: THREE.Plane
  ): THREE.Group {
    const group = new THREE.Group();
    const clipPlanes = clippingPlane ? [clippingPlane] : [];

    const boneMat =
      shading === 'HOLOGRAPHIC'
        ? new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            clippingPlanes: clipPlanes,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.42,
            metalness: 0.08,
            clippingPlanes: clipPlanes,
          });

    const hematomaMat = new THREE.MeshStandardMaterial({
      color: 0x881337, // Deep venous blood
      roughness: 0.25,
      metalness: 0.15,
      emissive: 0x4c0519,
      emissiveIntensity: 0.4,
      clippingPlanes: clipPlanes,
    });

    const brainTissueMat = new THREE.MeshStandardMaterial({
      color: 0xfbcfe8,
      roughness: 0.7,
      transparent: true,
      opacity: 0.85,
      clippingPlanes: clipPlanes,
    });

    // 1. Neurocranium (Cranial Vault)
    const vaultGeo = new THREE.SphereGeometry(1.8, 36, 28);
    vaultGeo.scale(1.0, 1.25, 1.15);
    const vault = new THREE.Mesh(vaultGeo, boneMat);
    vault.position.set(0, 0.4, 0);
    group.add(vault);

    // 2. Facial Skeleton & Maxilla
    const faceGeo = new THREE.BoxGeometry(1.6, 1.2, 1.1);
    const face = new THREE.Mesh(faceGeo, boneMat);
    face.position.set(0, -0.6, 0.8);
    group.add(face);

    // Mandible (Jawbone)
    const jawGeo = new THREE.CylinderGeometry(0.7, 0.85, 0.8, 16);
    jawGeo.scale(1.1, 0.6, 1.3);
    const jaw = new THREE.Mesh(jawGeo, boneMat);
    jaw.position.set(0, -1.3, 0.6);
    group.add(jaw);

    // 3. Eye Orbit Cavities (Left and Right)
    const orbitMat = new THREE.MeshBasicMaterial({ color: 0x020617 });
    const orbitGeo = new THREE.SphereGeometry(0.38, 16, 16);
    const leftOrbit = new THREE.Mesh(orbitGeo, orbitMat);
    leftOrbit.position.set(-0.55, -0.3, 1.35);
    const rightOrbit = new THREE.Mesh(orbitGeo, orbitMat);
    rightOrbit.position.set(0.55, -0.3, 1.35);
    group.add(leftOrbit);
    group.add(rightOrbit);

    // 4. Zygomatic Arches (Cheekbones)
    const archGeo = new THREE.TorusGeometry(0.5, 0.08, 8, 16, Math.PI);
    const leftArch = new THREE.Mesh(archGeo, boneMat);
    leftArch.position.set(-0.95, -0.5, 0.5);
    leftArch.rotation.y = Math.PI / 2;
    const rightArch = new THREE.Mesh(archGeo, boneMat);
    rightArch.position.set(0.95, -0.5, 0.5);
    rightArch.rotation.y = -Math.PI / 2;
    group.add(leftArch);
    group.add(rightArch);

    // 5. Internal Brain Tissue Hemispheres (visible during axial clipping)
    const brainGeo = new THREE.SphereGeometry(1.5, 24, 20);
    brainGeo.scale(0.95, 1.1, 1.05);
    const brain = new THREE.Mesh(brainGeo, brainTissueMat);
    brain.position.set(0, 0.45, 0);
    group.add(brain);

    // 6. ACUTE SUBDURAL HEMATOMA (Crescentic hemorrhage in right fronto-parietal region)
    const hematomaGeo = new THREE.TorusGeometry(1.2, 0.28, 16, 24, Math.PI * 0.7);
    hematomaGeo.scale(1.0, 1.3, 0.6);
    const hematoma = new THREE.Mesh(hematomaGeo, hematomaMat);
    hematoma.position.set(0.7, 0.6, 0.35);
    hematoma.rotation.x = 0.35;
    hematoma.rotation.y = -0.5;
    group.add(hematoma);

    // Craniotomy Surgical Corridors / Pointer Tag
    const craniotomyGuide = this.createSurgicalPointer(
      new THREE.Vector3(1.3, 0.9, 0.7),
      'CRANIOTOMY CORRIDOR'
    );
    group.add(craniotomyGuide);

    return group;
  }

  /**
   * CASE 2: 3D Thoracic Rib Cage & Pneumothorax Lungs
   */
  public static createThoracicRibCage(
    shading: ShadingMode,
    clippingPlane?: THREE.Plane
  ): THREE.Group {
    const group = new THREE.Group();
    const clipPlanes = clippingPlane ? [clippingPlane] : [];

    const boneMat =
      shading === 'HOLOGRAPHIC'
        ? new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            clippingPlanes: clipPlanes,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xf1f5f9,
            roughness: 0.45,
            metalness: 0.05,
            clippingPlanes: clipPlanes,
          });

    const lungMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      roughness: 0.5,
      clippingPlanes: clipPlanes,
    });

    const fracturedMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      roughness: 0.3,
      clippingPlanes: clipPlanes,
    });

    // 1. Thoracic Spine Column
    const spineGeo = new THREE.CylinderGeometry(0.18, 0.22, 3.6, 16);
    const spine = new THREE.Mesh(spineGeo, boneMat);
    spine.position.set(0, 0, -1.1);
    group.add(spine);

    // 2. Sternum (Breastbone)
    const sternumGeo = new THREE.BoxGeometry(0.35, 2.2, 0.12);
    const sternum = new THREE.Mesh(sternumGeo, boneMat);
    sternum.position.set(0, 0.2, 1.15);
    group.add(sternum);

    // 3. Ribs (10 bilateral pairs)
    for (let r = 0; r < 9; r++) {
      const ribRadius = 1.05 + Math.sin((r / 8) * Math.PI) * 0.35;
      const yPos = 1.1 - r * 0.32;
      const isFractured = r === 5 || r === 6; // 6th and 7th right ribs

      // Left rib
      const leftRibGeo = new THREE.TorusGeometry(ribRadius, 0.065, 8, 24, Math.PI * 0.92);
      const leftRib = new THREE.Mesh(leftRibGeo, boneMat);
      leftRib.position.set(0, yPos, 0);
      leftRib.rotation.x = Math.PI / 2 + 0.15;
      leftRib.rotation.z = 0.1;
      group.add(leftRib);

      // Right rib (with step-off fracture line if 6th/7th)
      const rightRibGeo = new THREE.TorusGeometry(ribRadius, 0.065, 8, 24, Math.PI * 0.92);
      const rightRib = new THREE.Mesh(rightRibGeo, isFractured ? fracturedMat : boneMat);
      rightRib.position.set(0, yPos, 0);
      rightRib.rotation.x = Math.PI / 2 + 0.15;
      rightRib.rotation.z = Math.PI - 0.1;
      if (isFractured) {
        rightRib.position.x += 0.08; // Displaced fracture step-off
      }
      group.add(rightRib);
    }

    // 4. Lungs (Left Lung Normal, Right Lung with Pneumothorax apical collapse)
    const leftLungGeo = new THREE.SphereGeometry(0.85, 20, 16);
    leftLungGeo.scale(0.85, 1.6, 0.9);
    const leftLung = new THREE.Mesh(leftLungGeo, lungMat);
    leftLung.position.set(-0.65, 0.1, 0);
    group.add(leftLung);

    // Collapsed Right Lung
    const rightLungGeo = new THREE.SphereGeometry(0.68, 20, 16);
    rightLungGeo.scale(0.75, 1.25, 0.8);
    const rightLung = new THREE.Mesh(rightLungGeo, lungMat);
    rightLung.position.set(0.65, -0.15, 0);
    group.add(rightLung);

    return group;
  }

  /**
   * CASE 3: 3D Femur with Comminuted Fracture & Butterfly Fragments
   */
  public static createFemurFracture(
    shading: ShadingMode,
    clippingPlane?: THREE.Plane
  ): THREE.Group {
    const group = new THREE.Group();
    const clipPlanes = clippingPlane ? [clippingPlane] : [];

    const boneMat =
      shading === 'HOLOGRAPHIC'
        ? new THREE.MeshBasicMaterial({
            color: 0x06b6d4,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            clippingPlanes: clipPlanes,
          })
        : new THREE.MeshStandardMaterial({
            color: 0xf8fafc,
            roughness: 0.38,
            metalness: 0.05,
            clippingPlanes: clipPlanes,
          });

    const marrowMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
    const fragmentMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Yellow/Amber fracture marker
      roughness: 0.3,
      clippingPlanes: clipPlanes,
    });

    // 1. Femoral Head & Neck
    const headGeo = new THREE.SphereGeometry(0.55, 24, 20);
    const head = new THREE.Mesh(headGeo, boneMat);
    head.position.set(-0.85, 2.1, 0.2);
    group.add(head);

    const neckGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.75, 16);
    const neck = new THREE.Mesh(neckGeo, boneMat);
    neck.position.set(-0.48, 1.85, 0.1);
    neck.rotation.z = -0.75;
    group.add(neck);

    // Greater Trochanter
    const trochGeo = new THREE.BoxGeometry(0.65, 0.75, 0.6);
    const troch = new THREE.Mesh(trochGeo, boneMat);
    troch.position.set(0.1, 1.7, 0);
    group.add(troch);

    // 2. Proximal Shaft
    const proxShaftGeo = new THREE.CylinderGeometry(0.32, 0.32, 1.8, 20);
    const proxShaft = new THREE.Mesh(proxShaftGeo, boneMat);
    proxShaft.position.set(0, 0.8, 0);
    group.add(proxShaft);

    // Medullary Canal proximal
    const proxCanalGeo = new THREE.CylinderGeometry(0.15, 0.15, 1.82, 16);
    const proxCanal = new THREE.Mesh(proxCanalGeo, marrowMat);
    proxCanal.position.set(0, 0.8, 0);
    group.add(proxCanal);

    // 3. Distal Shaft (Displaced rightward by 18mm and angulated 8°)
    const distShaftGeo = new THREE.CylinderGeometry(0.32, 0.42, 1.9, 20);
    const distShaft = new THREE.Mesh(distShaftGeo, boneMat);
    distShaft.position.set(0.35, -1.15, 0.1);
    distShaft.rotation.z = 0.12;
    group.add(distShaft);

    // 4. Comminuted Butterfly Bone Fragments floating in the fracture gap
    const frag1Geo = new THREE.ConeGeometry(0.25, 0.45, 5);
    const frag1 = new THREE.Mesh(frag1Geo, fragmentMat);
    frag1.position.set(-0.15, -0.15, 0.2);
    frag1.rotation.set(0.4, 0.2, 0.8);
    group.add(frag1);

    const frag2Geo = new THREE.BoxGeometry(0.22, 0.3, 0.18);
    const frag2 = new THREE.Mesh(frag2Geo, fragmentMat);
    frag2.position.set(0.25, -0.05, -0.15);
    frag2.rotation.set(-0.5, 0.3, -0.6);
    group.add(frag2);

    // 5. Femoral Condyles (Knee joint)
    const condyleGeo = new THREE.SphereGeometry(0.5, 20, 16);
    condyleGeo.scale(1.2, 0.8, 1.1);
    const condyles = new THREE.Mesh(condyleGeo, boneMat);
    condyles.position.set(0.45, -2.15, 0.15);
    group.add(condyles);

    return group;
  }

  /**
   * CUSTOM / UPLOADED: 3D Orthogonal Multi-Planar Cube with Real Slice Texture
   */
  public static createOrthogonalCube(
    scan: MedicalScanSeries,
    shading: ShadingMode,
    clippingPlane?: THREE.Plane
  ): THREE.Group {
    const group = new THREE.Group();
    const clipPlanes = clippingPlane ? [clippingPlane] : [];

    // Bounding Box Frame
    const boxGeo = new THREE.BoxGeometry(2.5, 2.5, 2.5);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const boundingBox = new THREE.Mesh(boxGeo, wireMat);
    group.add(boundingBox);

    // Central Axial Plane
    const axialPlaneGeo = new THREE.PlaneGeometry(2.4, 2.4);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      clippingPlanes: clipPlanes,
    });
    const axialPlane = new THREE.Mesh(axialPlaneGeo, planeMat);
    axialPlane.rotation.x = Math.PI / 2;
    group.add(axialPlane);

    // Coronal Plane
    const coronalPlane = new THREE.Mesh(
      axialPlaneGeo,
      new THREE.MeshBasicMaterial({
        color: 0x0d9488,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
        clippingPlanes: clipPlanes,
      })
    );
    group.add(coronalPlane);

    // Sagittal Plane
    const sagittalPlane = new THREE.Mesh(
      axialPlaneGeo,
      new THREE.MeshBasicMaterial({
        color: 0x6366f1,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.45,
        clippingPlanes: clipPlanes,
      })
    );
    sagittalPlane.rotation.y = Math.PI / 2;
    group.add(sagittalPlane);

    return group;
  }

  /**
   * Creates a surgical pointer line with glowing tip
   */
  private static createSurgicalPointer(targetPos: THREE.Vector3, label: string): THREE.Group {
    const guide = new THREE.Group();
    const tipGeo = new THREE.SphereGeometry(0.08, 12, 12);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x10b981 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.copy(targetPos);
    guide.add(tip);

    // Ring target
    const ringGeo = new THREE.RingGeometry(0.12, 0.16, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(targetPos);
    ring.position.z += 0.02;
    guide.add(ring);

    return guide;
  }
}
