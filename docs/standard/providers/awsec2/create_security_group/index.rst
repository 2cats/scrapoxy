=============================================
Tutorial: AWS / EC2 - Create a security group
=============================================


Security groups (and AMI) are restricted to a region. 

A security group in eu-west-1 is not available in eu-central-1.

.. warning::
    You must create a security group **by region**.


Step 1: Connect to your AWS console
===================================

Go to `AWS console`_.


Step 2: Go to EC2 dashboard
===========================
 
.. image:: step_1.jpg


Step 3: Create a Security Groups
================================
 
1. Click on *Security Groups*
2. Click on *Create Security Group*

.. image:: step_2.jpg


Step 4: Fill the Security Groups
================================
 
1. Fill the name and the description with *forward-proxy*
2. Fill the Inbound rule with:

    - Type: Custom TCP Rule
    - Port Range: 3128
    - Source: Anywhere

3. Click on *Create*

.. image:: step_3.jpg


.. _`AWS console`: https://console.aws.amazon.com
